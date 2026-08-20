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
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { decision } = body;
        if (!['validate', 'reject'].includes(decision)) {
            return NextResponse.json({ error: 'Décision invalide' }, { status: 400 });
        }

        const db = await getDb();
        const txId = new ObjectId(params.id);

        const tx = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ _id: txId });
        if (!tx || tx.type !== 'withdrawal') {
            return NextResponse.json({ error: 'Demande de retrait introuvable' }, { status: 404 });
        }
        if (tx.status !== 'pending') {
            return NextResponse.json({ error: 'Cette demande a déjà été traitée.' }, { status: 400 });
        }

        const now = new Date();
        const adminId = new ObjectId(session.user.id);

        if (decision === 'reject') {
            // Rembourser le solde du client
            await db.collection(COLLECTIONS.USERS).updateOne(
                { _id: tx.userId },
                { $inc: { accountBalance: tx.amount }, $set: { updatedAt: now } }
            );
        }

        await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
            { _id: txId },
            {
                $set: {
                    status: decision === 'validate' ? 'validated' : 'rejected',
                    validatedAt: now,
                    validatedBy: adminId,
                    updatedAt: now,
                }
            }
        );

        const amountDisplay = (tx.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

        await createNotification({
            userId: tx.userId,
            type: decision === 'validate' ? NOTIFICATION_TYPES.WITHDRAWAL_VALIDATED : NOTIFICATION_TYPES.WITHDRAWAL_REJECTED,
            title: decision === 'validate' ? 'Retrait validé' : 'Retrait refusé',
            message: decision === 'validate'
                ? `Votre retrait de ${amountDisplay} € a été validé et envoyé.`
                : `Votre retrait de ${amountDisplay} € a été refusé. Le montant a été recrédité sur votre portefeuille.`,
            link: '/mon-compte',
        });

        await writeAuditLog({
            actorType: 'admin',
            actorId: adminId,
            action: decision === 'validate' ? AUDIT_ACTIONS.WITHDRAWAL_VALIDATED : AUDIT_ACTIONS.WITHDRAWAL_REJECTED,
            targetType: 'transaction',
            targetId: txId,
            metadata: { amount: tx.amount, userId: tx.userId, method: tx.method },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[WITHDRAWAL DECISION ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}