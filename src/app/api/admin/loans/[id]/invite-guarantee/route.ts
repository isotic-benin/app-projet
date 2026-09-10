import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { sendGuaranteePaymentInstructionsEmail } from '@/lib/mailer';
import { formatIbanForDisplay } from '@/lib/bank-validation';
import { ObjectId } from 'mongodb';
import { CONTRACT_STUDY_FEE_CENTS } from '@/lib/loan-contract';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        let appId: ObjectId;
        try {
            appId = new ObjectId(params.id);
        } catch {
            return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
        }

        const db = await getDb();
        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId });
        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        if (application.status !== 'contract_signed') {
            return NextResponse.json({ error: 'Le client doit avoir déposé son contrat signé avant de pouvoir être invité à verser la garantie.' }, { status: 400 });
        }

        const now = new Date();
        const adminId = new ObjectId(session.user.id);
        const guaranteeAmount = application.guaranteeDeposit?.required > 0
            ? application.guaranteeDeposit.required
            : Math.round((application.amount || 0) * 0.10);
        const studyFee = CONTRACT_STUDY_FEE_CENTS;

        // Vérifier le RIB paramétré
        const bankSettings = await db.collection(COLLECTIONS.SETTINGS).find({ key: { $in: ['guarantee_bank_holder', 'guarantee_bank_iban', 'guarantee_bank_bic', 'guarantee_bank_name', 'guarantee_bank_instructions'] } }).toArray();
        const bankMap: Record<string, string> = {};
        bankSettings.forEach((s: any) => bankMap[s.key] = String(s.value || ''));
        const holder = bankMap['guarantee_bank_holder'] || '';
        const iban = bankMap['guarantee_bank_iban'] || '';
        if (!holder || !iban) {
            return NextResponse.json({ error: 'Veuillez d’abord configurer le RIB du compte de dépôt dans Paramètres > Compte de dépôt.' }, { status: 400 });
        }
        const bank = {
            holder,
            iban,
            ibanFormatted: formatIbanForDisplay(iban),
            bic: bankMap['guarantee_bank_bic'] || null,
            name: bankMap['guarantee_bank_name'] || null,
            instructions: bankMap['guarantee_bank_instructions'] || null,
        };

        // Récupérer l'utilisateur pour l'email
        const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: application.userId });
        if (!user?.email) return NextResponse.json({ error: 'Email client introuvable.' }, { status: 400 });

        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    'guaranteeDeposit.invitedAt': now,
                    'guaranteeDeposit.bankSnapshot': bank,
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'contract_signed',
                        changedAt: now,
                        changedBy: adminId,
                        note: `Invitation garantie envoyée — RIB ${bank.holder} ${bank.ibanFormatted}`,
                    },
                } as any,
            }
        );

        // Email avec RIB + notification + audit
        const mailResult = await sendGuaranteePaymentInstructionsEmail({
            to: user.email,
            user: { firstName: user.firstName, lastName: user.lastName, clientNumber: user.clientNumber || '' },
            application: {
                applicationNumber: application.applicationNumber,
                productName: application.productName,
                amount: application.amount,
                guaranteeAmount,
                studyFee,
                deadline: application.guaranteeDeposit?.deadline || null,
            },
            bank,
        });

        // Thread email pour suivi admin
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $push: {
                    emailThread: {
                        subject: `Versement requis — Garantie ${ (guaranteeAmount/100).toLocaleString('fr-FR')} € + frais ${ (studyFee/100).toLocaleString('fr-FR')} € — Dossier ${application.applicationNumber}`,
                        direction: 'outbound',
                        sentAt: now,
                        body: mailResult.success ? `Email RIB envoyé à ${user.email} — ${bank.holder} ${bank.ibanFormatted}` : `Échec envoi email RIB: ${mailResult.error?.message || 'erreur'}`,
                    }
                } as any
            }
        );

        await createNotification({
            userId: application.userId,
            type: NOTIFICATION_TYPES.GUARANTEE_INVITE,
            title: 'Dépôt de garantie — virement à effectuer',
            message: `Votre contrat signé a été validé. Veuillez verser ${((guaranteeAmount+studyFee)/100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € (garantie ${ (guaranteeAmount/100).toLocaleString('fr-FR')} € + frais ${ (studyFee/100).toLocaleString('fr-FR')} €) sur le RIB indiqué par email, puis déposez votre preuve dans votre espace.`,
            link: `/mon-compte/prets/${application._id.toString()}/garantie`,
        });

        await writeAuditLog({
            actorType: 'admin',
            actorId: adminId,
            action: 'guarantee.invite_sent',
            targetType: 'loan_application',
            targetId: appId,
            metadata: { userId: application.userId, amount: guaranteeAmount, studyFee, bank, mailSuccess: mailResult.success },
        });

        if (!mailResult.success) {
            return NextResponse.json({ error: 'Invitation enregistrée mais l’envoi d’email a échoué. Vérifiez la configuration SMTP.', warning: true }, { status: 207 });
        }
        return NextResponse.json({ success: true, mailSent: true });
    } catch (err: any) {
        console.error('[GUARANTEE INVITE ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}