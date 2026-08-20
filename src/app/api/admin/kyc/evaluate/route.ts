import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendKycDecisionEmail } from '@/lib/mailer';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // RBAC: Secure route for admins only
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Autorisation requise. Profil Admin manquant.' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, decision, reason } = body; // action is 'approve' | 'reject'

        if (!userId || !decision || !['approve', 'reject'].includes(decision)) {
            return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
        }

        const db = await getDb();
        const usersCol = db.collection(COLLECTIONS.USERS);

        const targetUser = await usersCol.findOne({ _id: new ObjectId(userId) });
        if (!targetUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

        const newKycStatus = decision === 'approve' ? 'verified' : 'rejected';

        await usersCol.updateOne(
            { _id: targetUser._id },
            {
                $set: {
                    'kyc.status': newKycStatus,
                    'kyc.reviewedBy': new ObjectId(session.user.id),
                    'kyc.reviewedAt': new Date(),
                    'kyc.rejectionReason': decision === 'reject' ? reason : null,
                    updatedAt: new Date(),
                }
            }
        );

        // Audit trace is strict and immutable
        await writeAuditLog({
            actorType: 'admin',
            actorId: new ObjectId(session.user.id),
            action: decision === 'approve' ? AUDIT_ACTIONS.KYC_APPROVED : AUDIT_ACTIONS.KYC_REJECTED,
            targetType: 'user',
            targetId: targetUser._id,
            metadata: { reason: reason || null }
        });

        // TODO / FIRE-AND-FORGET: Envoi de l'email via Resend pour avertir le client
        sendKycDecisionEmail(targetUser.email, targetUser.firstName, decision === 'approve' ? 'approve' : 'reject', reason).catch(e => console.error(e));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[ADMIN KYC EVALUATE ERROR]', err);
        return NextResponse.json({ error: 'Erreur Serveur Interne' }, { status: 500 });
    }
}
