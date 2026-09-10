import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        let userId: ObjectId;
        try {
            userId = new ObjectId(params.id);
        } catch {
            return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const confirmEmail = String(body.confirmEmail || '').trim().toLowerCase();
        const confirmText = String(body.confirmText || '').trim().toUpperCase();

        const db = await getDb();
        const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
        if (!user) {
            return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
        }

        // Sécurité : confirmation par email exact
        if (confirmEmail !== String(user.email).toLowerCase()) {
            return NextResponse.json({ error: 'Veuillez saisir l’email exact du client pour confirmer.' }, { status: 400 });
        }
        if (confirmText !== 'SUPPRIMER') {
            return NextResponse.json({ error: 'Veuillez saisir SUPPRIMER pour confirmer.' }, { status: 400 });
        }

        // Empêcher suppression de soi-même si admin est aussi client (edge)
        if (String(user.email).toLowerCase() === String(session.user.email).toLowerCase()) {
            return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 });
        }

        // Récupérer les IDs de prêts liés
        const loans = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).find({ userId }).project({ _id: 1 }).toArray();
        const loanIds: ObjectId[] = loans.map((l: any) => l._id);

        // Compteurs avant suppression (pour audit)
        const counts = {
            loans: loanIds.length,
            transactions: await db.collection(COLLECTIONS.TRANSACTIONS).countDocuments({ userId }),
            repaymentSchedules: loanIds.length ? await db.collection(COLLECTIONS.REPAYMENT_SCHEDULES).countDocuments({ loanApplicationId: { $in: loanIds } }) : 0,
            repaymentSchedulesByUser: await db.collection(COLLECTIONS.REPAYMENT_SCHEDULES).countDocuments({ userId }),
            notifications: await db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({ userId }),
            auditLogs: await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
                $or: [
                    { targetId: userId },
                    { actorId: userId },
                    ...(loanIds.length ? [{ targetId: { $in: loanIds } } as any] : []),
                ],
            }),
            emailLogs: await db.collection(COLLECTIONS.EMAIL_LOGS).countDocuments({
                $or: [
                    { to: user.email },
                    ...(loanIds.length ? [{ relatedApplicationId: { $in: loanIds } } as any] : []),
                ],
            }),
            passwordResets: await db.collection(COLLECTIONS.PASSWORD_RESETS).countDocuments({
                $or: [{ userId }, { email: user.email }],
            }),
        };

        // Audit avant suppression (conserver trace de l'action)
        await writeAuditLog({
            actorType: 'admin',
            actorId: new ObjectId(session.user.id),
            action: AUDIT_ACTIONS.USER_DELETED,
            targetType: 'user',
            targetId: userId,
            metadata: {
                email: user.email,
                clientNumber: user.clientNumber,
                name: `${user.firstName} ${user.lastName}`,
                counts,
            },
        });

        // Suppressions en cascade
        // 1. Prêts
        if (loanIds.length) {
            await db.collection(COLLECTIONS.LOAN_APPLICATIONS).deleteMany({ userId });
        }
        // 2. Transactions
        await db.collection(COLLECTIONS.TRANSACTIONS).deleteMany({ userId });
        // 3. Échéanciers (par loanIds + par userId fallback)
        if (loanIds.length) {
            await db.collection(COLLECTIONS.REPAYMENT_SCHEDULES).deleteMany({ loanApplicationId: { $in: loanIds } });
        }
        await db.collection(COLLECTIONS.REPAYMENT_SCHEDULES).deleteMany({ userId });
        // 4. Notifications
        await db.collection(COLLECTIONS.NOTIFICATIONS).deleteMany({ userId });
        // 5. Email logs
        await db.collection(COLLECTIONS.EMAIL_LOGS).deleteMany({
            $or: [
                { to: user.email },
                ...(loanIds.length ? [{ relatedApplicationId: { $in: loanIds } } as any] : []),
            ],
        });
        // 6. Audit logs liés (optionnel : on garde l'entrée de suppression elle-même, donc on supprime avant de logger ? On a déjà loggé, on supprime le reste)
        await db.collection(COLLECTIONS.AUDIT_LOGS).deleteMany({
            $or: [
                { targetId: userId },
                { actorId: userId },
                ...(loanIds.length ? [{ targetId: { $in: loanIds } } as any] : []),
            ],
        });
        // Ré-insérer le log de suppression (car on vient de le supprimer si targetId = userId)
        await writeAuditLog({
            actorType: 'admin',
            actorId: new ObjectId(session.user.id),
            action: AUDIT_ACTIONS.USER_DELETED,
            targetType: 'user',
            targetId: userId,
            metadata: {
                email: user.email,
                clientNumber: user.clientNumber,
                name: `${user.firstName} ${user.lastName}`,
                counts,
                deletedAt: new Date().toISOString(),
            },
        });
        // 7. Password resets
        try {
            await db.collection(COLLECTIONS.PASSWORD_RESETS).deleteMany({ $or: [{ userId }, { email: user.email }] });
        } catch {}
        // 8. Suppression finale du compte
        await db.collection(COLLECTIONS.USERS).deleteOne({ _id: userId });

        // Note : les fichiers Vercel Blob (/api/fichier/{userId}/...) restent orphelins ; nettoyage manuel possible via dashboard Vercel.

        return NextResponse.json({ success: true, deleted: { userId: userId.toString(), email: user.email, counts } });
    } catch (err: any) {
        console.error('[DELETE USER ERROR]', err);
        return NextResponse.json({ error: 'Erreur système lors de la suppression.' }, { status: 500 });
    }
}
