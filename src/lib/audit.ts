import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from './db';

type ActorType = 'admin' | 'client' | 'system';

interface AuditLogEntry {
    actorType: ActorType;
    actorId: ObjectId | null;
    action: string;
    targetType: string;
    targetId: ObjectId;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Write an immutable audit log entry.
 * Should be called for every sensitive action: loan decision, deposit validation, etc.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        const db = await getDb();
        await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
            ...entry,
            actorId: entry.actorId ?? null,
            metadata: entry.metadata ?? {},
            ipAddress: entry.ipAddress ?? null,
            userAgent: entry.userAgent ?? null,
            createdAt: new Date(),
        });
    } catch (err) {
        // Audit logs must NEVER throw and block business operations
        console.error('[AUDIT LOG ERROR]', err);
    }
}

// Common action constants
export const AUDIT_ACTIONS = {
    // User / KYC
    USER_REGISTERED: 'user.registered',
    USER_EMAIL_VERIFIED: 'user.email_verified',
    KYC_SUBMITTED: 'kyc.submitted',
    KYC_APPROVED: 'kyc.approved',
    KYC_REJECTED: 'kyc.rejected',

    // Account
    ACCOUNT_CREATED: 'account.created',
    INITIAL_DEPOSIT_SUBMITTED: 'initial_deposit.submitted',
    INITIAL_DEPOSIT_VALIDATED: 'initial_deposit.validated',
    INITIAL_DEPOSIT_REJECTED: 'initial_deposit.rejected',
    ACCOUNT_ACTIVATED: 'account.activated',

    // Loan applications
    LOAN_APPLICATION_SUBMITTED: 'loan_application.submitted',
    LOAN_APPLICATION_APPROVED: 'loan_application.approved',
    LOAN_APPLICATION_REJECTED: 'loan_application.rejected',
    LOAN_APPLICATION_INFO_REQUESTED: 'loan_application.additional_info_requested',
    LOAN_APPLICATION_EXPIRED: 'loan_application.expired',

    // Guarantee deposit
    GUARANTEE_DEPOSIT_SUBMITTED: 'guarantee_deposit.submitted',
    GUARANTEE_DEPOSIT_VALIDATED: 'guarantee_deposit.validated',
    GUARANTEE_DEPOSIT_REJECTED: 'guarantee_deposit.rejected',

    // Loan communication
    LOAN_CONTRACT_SENT: 'loan_application.contract_sent',

    // Wallet
    ADDITIONAL_DEPOSIT_SUBMITTED: 'additional_deposit.submitted',
    WITHDRAWAL_SUBMITTED: 'withdrawal.submitted',
    WITHDRAWAL_VALIDATED: 'withdrawal.validated',
    WITHDRAWAL_REJECTED: 'withdrawal.rejected',

    // Disbursement & repayment
    LOAN_DISBURSED: 'loan.disbursed',
    REPAYMENT_SUBMITTED: 'repayment.submitted',
    REPAYMENT_VALIDATED: 'repayment.validated',
    LOAN_COMPLETED: 'loan.completed',
    LOAN_DEFAULTED: 'loan.defaulted',

    // Admin
    ADMIN_LOGIN: 'admin.login',
    SETTINGS_UPDATED: 'settings.updated',
    LOAN_PRODUCT_UPDATED: 'loan_product.updated',
} as const;
