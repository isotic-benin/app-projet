import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ObjectId } from 'mongodb';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }
        const body = await req.json();
        const { decision, reason } = body; // 'approve' | 'reject'
        if (!['approve', 'reject'].includes(decision)) return NextResponse.json({ error: 'Décision invalide' }, { status: 400 });

        const db = await getDb();
        const appId = new ObjectId(params.id);
        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId });
        if (!application) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

        if (application.status !== 'contract_signed' || application.guaranteeDeposit?.status !== 'submitted') {
            return NextResponse.json({ error: 'Aucune preuve de garantie en attente pour ce dossier.' }, { status: 400 });
        }

        const adminId = new ObjectId(session.user.id);
        const now = new Date();
        const txId = application.guaranteeDeposit?.transactionId;

        if (decision === 'approve') {
            const guaranteeAmount = application.guaranteeDeposit?.required || Math.round((application.amount || 0) * 0.10);
            // Valider transaction
            if (txId) {
                await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
                    { _id: new ObjectId(txId) },
                    { $set: { status: 'completed', validatedAt: now, validatedBy: adminId, updatedAt: now } }
                );
            }
            await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                { _id: appId },
                {
                    $set: {
                        status: 'guarantee_paid',
                        'guaranteeDeposit.status': 'paid',
                        'guaranteeDeposit.paidAt': now,
                        'guaranteeDeposit.validatedAt': now,
                        'guaranteeDeposit.validatedBy': adminId,
                        'guaranteeDeposit.paid': guaranteeAmount,
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'guarantee_paid',
                            changedAt: now,
                            changedBy: adminId,
                            note: 'Preuve de garantie validée — prêt à débloquer.',
                        },
                    } as any,
                }
            );
            await createNotification({
                userId: application.userId,
                type: NOTIFICATION_TYPES.GUARANTEE_PAID,
                title: 'Garantie validée',
                message: `Votre versement de ${(guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € a été validé. Votre prêt est désormais prêt à être débloqué.`,
                link: `/mon-compte/prets`,
            });
            await writeAuditLog({
                actorType: 'admin',
                actorId: adminId,
                action: AUDIT_ACTIONS.GUARANTEE_DEPOSIT_VALIDATED,
                targetType: 'loan_application',
                targetId: appId,
                metadata: { decision: 'approve', transactionId: txId },
            });
        } else {
            if (!reason || String(reason).trim().length < 10) return NextResponse.json({ error: 'Motif de rejet requis (min 10 caractères).' }, { status: 400 });
            if (txId) {
                await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
                    { _id: new ObjectId(txId) },
                    { $set: { status: 'rejected', rejectionReason: String(reason).trim(), validatedAt: now, validatedBy: adminId, updatedAt: now } }
                );
            }
            await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                { _id: appId },
                {
                    $set: {
                        'guaranteeDeposit.status': 'rejected',
                        'guaranteeDeposit.rejectionReason': String(reason).trim(),
                        'guaranteeDeposit.rejectedAt': now,
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'contract_signed',
                            changedAt: now,
                            changedBy: adminId,
                            note: `Preuve garantie rejetée : ${String(reason).trim()}`,
                        },
                    } as any,
                }
            );
            await createNotification({
                userId: application.userId,
                type: 'guarantee_rejected',
                title: 'Preuve de garantie rejetée',
                message: `Votre preuve a été rejetée : ${String(reason).trim()}. Veuillez déposer une nouvelle preuve lisible.`,
                link: `/mon-compte/prets/${application._id.toString()}/garantie`,
            });
            await writeAuditLog({
                actorType: 'admin',
                actorId: adminId,
                action: AUDIT_ACTIONS.GUARANTEE_DEPOSIT_REJECTED,
                targetType: 'loan_application',
                targetId: appId,
                metadata: { decision: 'reject', reason },
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[GUARANTEE VALIDATE ERROR]', e);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
