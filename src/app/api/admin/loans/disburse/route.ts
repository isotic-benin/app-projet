import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
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
        const capitalPaid = monthly - interest;
        remaining = Math.max(0, remaining - capitalPaid);

        // Add exactly i months to startDate
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        rules.push({
            number: i,
            dueDate,
            principalDue: capitalPaid,
            interestDue: interest,
            totalDue: monthly,
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
            return NextResponse.json({ error: 'Impossible de débloquer : le client doit d\'abord verser la garantie (10% du montant).' }, { status: 400 });
        }

        const adminId = new ObjectId(session.user.id);
        const now = new Date();

        // Generate Repayment Schedule
        const schedule = generateAmortizationTable(
            application.amount, // minor units centimes
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
            amount: application.amount, // Full amount in minor units
            status: 'completed',
            method, // e.g 'bank_transfer'
            reference: reference || null,
            createdAt: now,
        };
        const txRes = await db.collection('transactions').insertOne(txDoc);

        // Créditer le portefeuille (solde) du client avec le montant du prêt
        await db.collection(COLLECTIONS.USERS).updateOne(
            { _id: application.userId },
            { $inc: { accountBalance: application.amount }, $set: { updatedAt: now } }
        );

        // Update Loan status
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    status: 'disbursed',
                    'disbursement.disbursedAt': now,
                    'disbursement.disbursedBy': adminId,
                    'disbursement.method': method,
                    'disbursement.transactionId': txRes.insertedId,
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
            }
        );

        await createNotification({
            userId: application.userId,
            type: NOTIFICATION_TYPES.LOAN_DISBURSED,
            title: 'Votre prêt a été débloqué',
            message: `${(application.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € ont été crédités sur votre portefeuille. Bonne réalisation de votre projet !`,
            link: '/mon-compte',
        });

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
