import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ObjectId } from 'mongodb';

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

        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    'guaranteeDeposit.invitedAt': now,
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'contract_signed',
                        changedAt: now,
                        changedBy: adminId,
                        note: 'Invitation envoyée au client pour le versement de la garantie',
                    },
                } as any,
            }
        );

        await createNotification({
            userId: application.userId,
            type: NOTIFICATION_TYPES.GUARANTEE_INVITE,
            title: 'Dépôt de garantie requis',
            message: `Votre contrat signé a bien été reçu. Pour finaliser le déblocage de votre prêt, veuillez verser la garantie de ${(guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € indiquée dans votre contrat.`,
            link: `/mon-compte/prets/${application._id.toString()}/garantie`,
        });

        await writeAuditLog({
            actorType: 'admin',
            actorId: adminId,
            action: 'guarantee.invite_sent',
            targetType: 'loan_application',
            targetId: appId,
            metadata: { userId: application.userId, amount: guaranteeAmount },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[GUARANTEE INVITE ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}