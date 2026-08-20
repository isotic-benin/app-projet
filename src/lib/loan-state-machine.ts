import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from './db';
import { writeAuditLog } from './audit';

export type LoanApplicationStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'additional_info_requested'
    | 'approved'
    | 'rejected'
    | 'awaiting_guarantee_deposit'
    | 'guarantee_deposit_submitted'
    | 'guarantee_deposit_validated'
    | 'disbursed'
    | 'active'
    | 'completed'
    | 'defaulted'
    | 'expired'
    | 'cancelled';

type TransitionMap = Partial<Record<LoanApplicationStatus, LoanApplicationStatus[]>>;

// All valid state transitions
const VALID_TRANSITIONS: TransitionMap = {
    draft: ['submitted', 'cancelled'],
    submitted: ['under_review', 'cancelled'],
    under_review: ['additional_info_requested', 'approved', 'rejected'],
    additional_info_requested: ['under_review', 'cancelled'],
    approved: ['awaiting_guarantee_deposit'],
    awaiting_guarantee_deposit: ['guarantee_deposit_submitted', 'expired'],
    guarantee_deposit_submitted: ['guarantee_deposit_validated', 'awaiting_guarantee_deposit'],
    guarantee_deposit_validated: ['disbursed'],
    disbursed: ['active'],
    active: ['completed', 'defaulted'],
};

// Terminal states (no further transitions allowed)
const TERMINAL_STATES: LoanApplicationStatus[] = ['rejected', 'completed', 'defaulted', 'expired', 'cancelled'];

export function isValidTransition(from: LoanApplicationStatus, to: LoanApplicationStatus): boolean {
    if (TERMINAL_STATES.includes(from)) return false;
    const allowed = VALID_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
}

export interface TransitionOptions {
    actorType: 'admin' | 'client' | 'system';
    actorId: ObjectId | null;
    note?: string;
    ipAddress?: string;
    additionalUpdates?: Record<string, unknown>;
}

/**
 * The ONLY function that should change a loan application status.
 * Validates transition, persists status history, writes audit log.
 */
export async function transitionLoanApplication(
    applicationId: ObjectId,
    newStatus: LoanApplicationStatus,
    options: TransitionOptions
): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    const col = db.collection(COLLECTIONS.LOAN_APPLICATIONS);

    const app = await col.findOne({ _id: applicationId });
    if (!app) {
        return { success: false, error: 'Application not found' };
    }

    const currentStatus = app.status as LoanApplicationStatus;
    if (!isValidTransition(currentStatus, newStatus)) {
        return {
            success: false,
            error: `Transition from '${currentStatus}' to '${newStatus}' is not allowed`,
        };
    }

    const historyEntry = {
        status: newStatus,
        changedAt: new Date(),
        changedBy: options.actorId,
        note: options.note ?? null,
    };

    const updateDoc: Record<string, unknown> = {
        $set: {
            status: newStatus,
            updatedAt: new Date(),
            ...options.additionalUpdates,
        },
        $push: {
            statusHistory: historyEntry,
        },
    };

    await col.updateOne({ _id: applicationId }, updateDoc);

    await writeAuditLog({
        actorType: options.actorType,
        actorId: options.actorId,
        action: `loan_application.${newStatus}`,
        targetType: 'loanApplication',
        targetId: applicationId,
        metadata: { previousStatus: currentStatus, newStatus, note: options.note },
        ipAddress: options.ipAddress ?? null,
    });

    return { success: true };
}
