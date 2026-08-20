import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from './db';

export interface CreateNotificationInput {
    userId: ObjectId;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
    try {
        const db = await getDb();
        await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link ?? null,
            metadata: input.metadata ?? {},
            read: false,
            readAt: null,
            createdAt: new Date(),
        });
    } catch (err) {
        console.error('[NOTIFICATION ERROR]', err);
    }
}

export const NOTIFICATION_TYPES = {
    LOAN_APPROVED: 'loan_approved',
    CONTRACT_SENT: 'contract_sent',
    GUARANTEE_INVITE: 'guarantee_invite',
    GUARANTEE_PAID: 'guarantee_paid',
    LOAN_DISBURSED: 'loan_disbursed',
    WITHDRAWAL_VALIDATED: 'withdrawal_validated',
    WITHDRAWAL_REJECTED: 'withdrawal_rejected',
} as const;