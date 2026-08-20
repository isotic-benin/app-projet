import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';

/**
 * Admin endpoint to make a decision (approve/reject) on a loan application.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const body = await req.json();
        const { applicationId, decision, note } = body;

        if (!applicationId || !decision || !['approve', 'reject'].includes(decision)) {
            return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
        }

        const db = await getDb();
        const appsCol = db.collection(COLLECTIONS.LOAN_APPLICATIONS);
        const appId = new ObjectId(applicationId);

        const application = await appsCol.findOne({ _id: appId });
        if (!application) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

        // Only decide on submitted or under_review or decision_pending
        const decidableStatuses = ['submitted', 'under_review', 'decision_pending'];
        if (!decidableStatuses.includes(application.status)) {
            return NextResponse.json({ error: `Impossible de statuer sur un dossier en statut "${application.status}"` }, { status: 400 });
        }

        const adminId = new ObjectId(session.user.id);
        const now = new Date();

        if (decision === 'approve') {
            // Set guarantee deadline to 14 days from now
            const guaranteeDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            const guaranteeAmount = Math.round((application.amount || 0) * 0.10);

            await appsCol.updateOne(
                { _id: appId },
                {
                    $set: {
                        status: 'approved_pending_guarantee',
                        assignedAdmin: adminId,
                        decision: 'approved',
                        decisionDate: now,
                        decisionNote: note || null,
                        'guaranteeDeposit.required': guaranteeAmount,
                        'guaranteeDeposit.deadline': guaranteeDeadline,
                        'guaranteeDeposit.status': 'pending',
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'approved_pending_guarantee',
                            changedAt: now,
                            changedBy: adminId,
                            note: note || 'Dossier approuvé par l\'administration',
                        },
                    } as any,
                }
            );

            await writeAuditLog({
                actorType: 'admin',
                actorId: adminId,
                action: AUDIT_ACTIONS.LOAN_APPLICATION_APPROVED,
                targetType: 'loan_application',
                targetId: appId,
                metadata: { note, guaranteeDeadline },
            });

        } else {
            // Reject
            await appsCol.updateOne(
                { _id: appId },
                {
                    $set: {
                        status: 'rejected',
                        assignedAdmin: adminId,
                        decision: 'rejected',
                        decisionDate: now,
                        decisionNote: note || 'Dossier refusé',
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'rejected',
                            changedAt: now,
                            changedBy: adminId,
                            note: note || 'Dossier refusé par l\'administration',
                        },
                    } as any,
                }
            );

            await writeAuditLog({
                actorType: 'admin',
                actorId: adminId,
                action: AUDIT_ACTIONS.LOAN_APPLICATION_REJECTED,
                targetType: 'loan_application',
                targetId: appId,
                metadata: { note },
            });
        }

        return NextResponse.json({ success: true, decision });

    } catch (err: any) {
        console.error('[ADMIN LOAN DECISION ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
