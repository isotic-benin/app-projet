import { MongoClient, Db } from 'mongodb';

const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

interface MongoClientCache {
    client: MongoClient | null;
    promise: Promise<MongoClient> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: MongoClientCache;
}

let cached: MongoClientCache = global._mongoClientPromise;

if (!cached) {
    cached = global._mongoClientPromise = { client: null, promise: null };
}

async function dbConnect(): Promise<Db> {
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined. Please add it to your environment variables.');
    }

    if (cached.client) {
        return cached.client.db('microfinance');
    }

    if (!cached.promise) {
        const opts = {
            maxPoolSize: 10,
        };
        cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
            cached.client = client;
            return client;
        });
    }

    const client = await cached.promise;
    return client.db('microfinance');
}

export async function getDb(): Promise<Db> {
    return dbConnect();
}

export async function getClient(): Promise<MongoClient> {
    if (!cached.promise) {
        await dbConnect();
    }
    return cached.promise!.then(() => cached.client!);
}

// Collection name constants
export const COLLECTIONS = {
    USERS: 'users',
    ACCOUNTS: 'accounts',
    TRANSACTIONS: 'transactions',
    LOAN_PRODUCTS: 'loanProducts',
    LOAN_SIMULATIONS: 'loanSimulations',
    LOAN_APPLICATIONS: 'loanApplications',
    REPAYMENT_SCHEDULES: 'repaymentSchedules',
    ADMIN_USERS: 'adminUsers',
    AUDIT_LOGS: 'auditLogs',
    EMAIL_LOGS: 'emailLogs',
    SETTINGS: 'settings',
    NOTIFICATIONS: 'notifications',
} as const;
