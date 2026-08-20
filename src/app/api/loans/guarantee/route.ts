import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { applicationId, useBalance } = body;

        if (!applicationId) {
            return NextResponse.json({ error: 'ID de dossier requis' }, { status: 400 });
        }

        const db = await getDb();
        const userId = new ObjectId(session.user.id);
        const appId = new ObjectId(applicationId);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({
            _id: appId,
            userId,
            status: { $in: ['approved_pending_guarantee', 'contract_signed'] },
        });

        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable ou non éligible au versement de garantie.' }, { status: 404 });
        }

        if (application.guaranteeDeposit.deadline && new Date() > new Date(application.guaranteeDeposit.deadline)) {
            await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                { _id: appId },
                {
                    $set: { status: 'expired', updatedAt: new Date() },
                    $push: {
                        statusHistory: {
                            status: 'expired',
                            changedAt: new Date(),
                            changedBy: null,
                            note: 'Délai de 14 jours expiré pour le dépôt de garantie',
                        },
                    } as any,
                }
            );
            return NextResponse.json({ error: 'Le délai de 14 jours pour le dépôt de garantie est dépassé. Votre dossier a expiré.' }, { status: 400 });
        }

        const guaranteeRequired = application.guaranteeDeposit?.required > 0
            ? application.guaranteeDeposit.required
            : Math.round((application.amount || 0) * 0.10);

        if (useBalance) {
            const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
            const balance = user?.accountBalance || 0;

            if (balance < guaranteeRequired) {
                return NextResponse.json({ error: 'Solde insuffisant pour couvrir la garantie.' }, { status: 400 });
            }

            await db.collection(COLLECTIONS.USERS).updateOne(
                { _id: userId },
                { $inc: { accountBalance: -guaranteeRequired }, $set: { updatedAt: new Date() } }
            );
        } else {
            await new Promise(r => setTimeout(r, 1000));
        }

        const txResult = await db.collection('transactions').insertOne({
            userId,
            loanApplicationId: appId,
            type: 'guarantee_deposit',
            amount: guaranteeRequired,
            status: 'completed',
            method: useBalance ? 'from_balance' : 'simulation',
            createdAt: new Date(),
        });

        const now = new Date();
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    status: 'guarantee_paid',
                    'guaranteeDeposit.paid': guaranteeRequired,
                    'guaranteeDeposit.status': 'paid',
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'guarantee_paid',
                        changedAt: now,
                        changedBy: userId,
                        note: useBalance
                            ? 'Dépôt de garantie versé depuis le solde du compte'
                            : 'Dépôt de garantie versé par le client',
                    },
                } as any,
            }
        );

        await createNotification({
            userId,
            type: NOTIFICATION_TYPES.GUARANTEE_PAID,
            title: 'Garantie versée avec succès',
            message: `Votre garantie de ${(guaranteeRequired / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € a bien été reçue. Votre dossier est prêt pour le déblocage des fonds.`,
            link: '/mon-compte/prets',
        });

        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: AUDIT_ACTIONS.GUARANTEE_DEPOSIT_SUBMITTED,
            targetType: 'loan_application',
            targetId: appId,
            metadata: { amount: guaranteeRequired, transactionId: txResult.insertedId, method: useBalance ? 'from_balance' : 'simulation' },
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[GUARANTEE DEPOSIT ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
