import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Endpoint called by Vercel Cron or any other Task Scheduler (e.g., node-cron) daily at midnight.
 * Automatically expires loan applications that have passed their 14-day guarantee deposit deadline.
 */
export async function GET(req: Request) {
    try {
        // 1. Basic Security: ensure the request is from a trusted cron runner via Bearer Token or Vercel Cron header
        const authHeader = req.headers.get('authorization');
        const isVercelCron = req.headers.get('x-vercel-cron') === '1';

        if (!isVercelCron && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
        }

        const db = await getDb();
        const now = new Date();

        // 2. Find eligible expired applications
        const appsCol = db.collection(COLLECTIONS.LOAN_APPLICATIONS);
        const expiredApps = await appsCol.find({
            status: { $in: ['approved_pending_guarantee', 'awaiting_guarantee_deposit'] },
            'guaranteeDeposit.deadline': { $lt: now }
        }).toArray();

        let count = 0;

        // 3. Process each one individually to add Audit Logs and History
        for (const app of expiredApps) {
            await appsCol.updateOne(
                { _id: app._id },
                {
                    $set: {
                        status: 'expired',
                        'guaranteeDeposit.status': 'expired',
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'expired',
                            changedAt: now,
                            changedBy: null, // System action
                            note: 'Expiré automatiquement (Délai de 14 jours dépassé sans versement de garantie)',
                        }
                    } as any
                }
            );

            await writeAuditLog({
                actorType: 'system',
                actorId: null,
                action: AUDIT_ACTIONS.LOAN_APPLICATION_EXPIRED,
                targetType: 'loan_application',
                targetId: app._id,
                metadata: { reason: 'cron_deadline_exceeded' }
            });

            count++;
        }

        return NextResponse.json({ success: true, processedCount: count, message: `Expiré ${count} dossier(s).` });
    } catch (error) {
        console.error('[CRON CHECK GUARANTEES ERROR]', error);
        return NextResponse.json({ error: 'Erreur Serveur Interne' }, { status: 500 });
    }
}
