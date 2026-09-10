import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { sendLoanDisbursedEmail } from '@/lib/mailer';
import { ObjectId } from 'mongodb';

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const r = (annualRate / 100) / 12;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

function generateAmortizationTable(principal: number, annualRate: number, months: number, startDate: Date) {
    const r = (annualRate / 100) / 12;
    const monthly = computeMonthlyPayment(principal, annualRate, months);
    let remaining = principal;

    const rules = [];

    for (let i = 1; i <= months; i++) {
        const interest = Math.round(remaining * r);
        let capitalPaid = monthly - interest;

        if (i === months) {
            // Dernière échéance : solder exactement le capital restant (évite les écarts d'arrondi)
            capitalPaid = remaining;
        }

        remaining = Math.max(0, remaining - capitalPaid);

        // Add exactly i months to startDate
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        rules.push({
            number: i,
            dueDate,
            principalDue: capitalPaid,
            interestDue: interest,
            totalDue: capitalPaid + interest,
            amountPaid: 0,
            status: 'pending', // 'pending' | 'paid' | 'late'
            paidAt: null,
            transactionIds: []
        });
    }
    return rules;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const body = await req.json();
        const { applicationId, method, reference } = body;

        if (!applicationId || !method) {
            return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
        }

        const db = await getDb();
        const appId = new ObjectId(applicationId);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId });
        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        if (application.status !== 'guarantee_paid') {
            return NextResponse.json({ error: 'Impossible de débloquer : la garantie doit être validée par l’équipe.' }, { status: 400 });
        }
        if (!application.contract?.signed) {
            return NextResponse.json({ error: 'Le contrat signé du client est requis avant le déblocage.' }, { status: 400 });
        }
        if (application.guaranteeDeposit?.status !== 'paid') {
            return NextResponse.json({ error: 'La preuve de garantie n’a pas été validée.' }, { status: 400 });
        }

        // Idempotence : si déjà débloqué, retourner succès sans re-créditer
        if (['disbursed', 'active', 'completed'].includes(application.status)) {
            return NextResponse.json({ success: true, alreadyDisbursed: true, message: 'Prêt déjà débloqué.' });
        }
        // Vérifier qu'aucune transaction de déblocage n'existe déjà (garde-fou anti double-clic)
        const existingDisbursement = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ loanApplicationId: appId, type: 'disbursement' });
        if (existingDisbursement) {
            return NextResponse.json({ error: 'Ce prêt a déjà été débloqué. Opération unique.' }, { status: 409 });
        }
        const existingSchedule = await db.collection('repaymentSchedules').findOne({ loanApplicationId: appId });
        if (existingSchedule) {
            return NextResponse.json({ error: 'Échéancier déjà généré — prêt déjà débloqué.' }, { status: 409 });
        }

        const adminId = new ObjectId(session.user.id);
        const now = new Date();

        // Transition atomique : ne passe à disbursed que si status est encore guarantee_paid
        const atomicUpdate = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOneAndUpdate(
            { _id: appId, status: 'guarantee_paid', 'guaranteeDeposit.status': 'paid' },
            {
                $set: {
                    status: 'disbursed',
                    'disbursement.disbursedAt': now,
                    'disbursement.disbursedBy': adminId,
                    'disbursement.method': method,
                    'disbursement.creditedToWallet': true,
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'disbursed',
                        changedAt: now,
                        changedBy: adminId,
                        note: `Fonds débloqués via ${method} et crédités sur le compte du client`,
                    },
                } as any,
            },
            { returnDocument: 'after' }
        );

        const updatedDoc = (atomicUpdate as any)?.value !== undefined ? (atomicUpdate as any).value : atomicUpdate;
        if (!updatedDoc) {
            const fresh = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId });
            if (fresh && ['disbursed', 'active', 'completed'].includes(fresh.status)) {
                return NextResponse.json({ error: 'Ce prêt a déjà été débloqué. Opération unique.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Impossible de débloquer : statut invalide ou déjà traité.' }, { status: 409 });
        }

        // Generate Repayment Schedule (uniquement après succès atomique)
        const schedule = generateAmortizationTable(
            application.amount,
            application.annualRate,
            application.duration,
            now
        );

        const repaymentDoc = {
            loanApplicationId: appId,
            userId: application.userId,
            principal: application.amount,
            annualRate: application.annualRate,
            durationMonths: application.duration,
            startDate: now,
            installments: schedule,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection('repaymentSchedules').insertOne(repaymentDoc);

        // Create disbursement transaction
        const txDoc = {
            userId: application.userId,
            loanApplicationId: appId,
            type: 'disbursement',
            amount: application.amount,
            status: 'completed',
            method,
            reference: reference || null,
            createdAt: now,
        };
        const txRes = await db.collection('transactions').insertOne(txDoc);

        // Lier la transaction au dossier
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            { $set: { 'disbursement.transactionId': txRes.insertedId } }
        );

        // Créditer le portefeuille (une seule fois, après l'update atomique)
        await db.collection(COLLECTIONS.USERS).updateOne(
            { _id: application.userId },
            { $inc: { accountBalance: application.amount }, $set: { updatedAt: now } }
        );

        await createNotification({
            userId: application.userId,
            type: NOTIFICATION_TYPES.LOAN_DISBURSED,
            title: 'Votre prêt a été débloqué',
            message: `${(application.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € ont été crédités sur votre portefeuille. Connectez-vous pour retirer vos fonds : Mon portefeuille → Retirer de l’argent.`,
            link: '/mon-compte',
        });

        // Envoi email de notification de déblocage (non bloquant)
        try {
            const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: application.userId });
            if (user?.email) {
                const mailRes = await sendLoanDisbursedEmail({
                    to: user.email,
                    user: { firstName: user.firstName, lastName: user.lastName, clientNumber: user.clientNumber || '' },
                    application: {
                        applicationNumber: application.applicationNumber,
                        productName: application.productName,
                        amount: application.amount,
                        duration: application.duration,
                        annualRate: application.annualRate,
                    },
                });
                await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                    { _id: appId },
                    {
                        $push: {
                            emailThread: {
                                subject: `Fonds débloqués — ${(application.amount / 100).toLocaleString('fr-FR')} € — Dossier ${application.applicationNumber}`,
                                direction: 'outbound',
                                sentAt: new Date(),
                                body: mailRes.success ? `Email déblocage envoyé à ${user.email}` : `Échec email déblocage: ${mailRes.error?.message || 'erreur'}`,
                            },
                        } as any,
                    }
                );
            }
        } catch (mailErr) {
            console.error('[DISBURSE MAIL ERROR]', mailErr);
        }

        await writeAuditLog({
            actorType: 'admin',
            actorId: adminId,
            action: AUDIT_ACTIONS.LOAN_DISBURSED,
            targetType: 'loan_application',
            targetId: appId,
            metadata: { transactionId: txRes.insertedId, creditedToWallet: true, amount: application.amount },
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[DISBURSE ERROR]', err);
        return NextResponse.json({ error: 'System error' }, { status: 500 });
    }
}
