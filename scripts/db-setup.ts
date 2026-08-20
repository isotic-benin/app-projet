/**
 * Database setup script — creates all collections with JSON Schema validation and indexes.
 * Run once: npx tsx scripts/db-setup.ts
 */

import { MongoClient, IndexDescription } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'microfinance';

async function setup() {
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`✅ Connected to database: ${DB_NAME}`);

    // ──────────────────────────── USERS ────────────────────────────
    await createCollection(db, 'users', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['firstName', 'lastName', 'email', 'phone', 'passwordHash', 'status', 'createdAt'],
                properties: {
                    email: { bsonType: 'string' },
                    phone: { bsonType: 'string' },
                    status: { enum: ['pending_verification', 'active', 'suspended', 'closed'] },
                },
            },
        },
    });
    await createIndexes(db, 'users', [
        { key: { email: 1 }, unique: true, name: 'email_unique' },
        { key: { phone: 1 }, unique: true, name: 'phone_unique' },
        { key: { clientNumber: 1 }, unique: true, sparse: true, name: 'clientNumber_unique' },
        { key: { status: 1 }, name: 'status' },
        { key: { 'kyc.status': 1 }, name: 'kyc_status' },
    ]);

    // ──────────────────────────── ACCOUNTS ────────────────────────────
    await createCollection(db, 'accounts', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['userId', 'accountNumber', 'currency', 'balance', 'status', 'createdAt'],
                properties: {
                    status: { enum: ['pending_initial_deposit', 'active', 'frozen', 'closed'] },
                    balance: { bsonType: 'int' },
                },
            },
        },
    });
    await createIndexes(db, 'accounts', [
        { key: { userId: 1 }, unique: true, name: 'userId_unique' },
        { key: { accountNumber: 1 }, unique: true, name: 'accountNumber_unique' },
        { key: { status: 1 }, name: 'status' },
    ]);

    // ──────────────────────────── TRANSACTIONS ────────────────────────────
    await createCollection(db, 'transactions', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['reference', 'userId', 'accountId', 'type', 'amount', 'currency', 'status', 'createdAt'],
                properties: {
                    type: { enum: ['initial_deposit', 'guarantee_deposit', 'disbursement', 'repayment', 'fee', 'refund'] },
                    status: { enum: ['pending_client_action', 'submitted', 'under_review', 'validated', 'rejected'] },
                },
            },
        },
    });
    await createIndexes(db, 'transactions', [
        { key: { reference: 1 }, unique: true, name: 'reference_unique' },
        { key: { userId: 1 }, name: 'userId' },
        { key: { accountId: 1 }, name: 'accountId' },
        { key: { status: 1 }, name: 'status' },
        { key: { relatedLoanApplicationId: 1 }, name: 'relatedLoanApplicationId' },
    ]);

    // ──────────────────────────── LOAN PRODUCTS ────────────────────────────
    await createCollection(db, 'loanProducts', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['slug', 'name', 'category', 'minAmount', 'maxAmount', 'minDurationMonths', 'maxDurationMonths', 'annualInterestRate', 'active'],
                properties: {
                    slug: { bsonType: 'string' },
                    category: { enum: ['personnel', 'auto', 'travaux', 'mini_pret', 'renouvelable', 'autre'] },
                },
            },
        },
    });
    await createIndexes(db, 'loanProducts', [
        { key: { slug: 1 }, unique: true, name: 'slug_unique' },
        { key: { active: 1 }, name: 'active' },
    ]);

    // ──────────────────────────── LOAN SIMULATIONS ────────────────────────────
    await createCollection(db, 'loanSimulations', {});
    await createIndexes(db, 'loanSimulations', [
        { key: { userId: 1 }, name: 'userId', sparse: true },
        { key: { createdAt: 1 }, name: 'createdAt', expireAfterSeconds: 7776000 }, // 90 days TTL
    ]);

    // ──────────────────────────── LOAN APPLICATIONS ────────────────────────────
    await createCollection(db, 'loanApplications', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['applicationNumber', 'userId', 'accountId', 'productId', 'amountRequested', 'status', 'createdAt'],
                properties: {
                    status: {
                        enum: [
                            'draft', 'submitted', 'under_review', 'additional_info_requested',
                            'approved', 'rejected', 'awaiting_guarantee_deposit',
                            'guarantee_deposit_submitted', 'guarantee_deposit_validated',
                            'disbursed', 'active', 'completed', 'defaulted', 'expired', 'cancelled',
                        ],
                    },
                },
            },
        },
    });
    await createIndexes(db, 'loanApplications', [
        { key: { applicationNumber: 1 }, unique: true, name: 'applicationNumber_unique' },
        { key: { userId: 1 }, name: 'userId' },
        { key: { status: 1 }, name: 'status' },
        { key: { productId: 1 }, name: 'productId' },
        { key: { 'guaranteeDeposit.dueDate': 1 }, name: 'guaranteeDeposit_dueDate', sparse: true },
    ]);

    // ──────────────────────────── REPAYMENT SCHEDULES ────────────────────────────
    await createCollection(db, 'repaymentSchedules', {});
    await createIndexes(db, 'repaymentSchedules', [
        { key: { loanApplicationId: 1 }, unique: true, name: 'loanApplicationId_unique' },
    ]);

    // ──────────────────────────── ADMIN USERS ────────────────────────────
    await createCollection(db, 'adminUsers', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['name', 'email', 'passwordHash', 'role', 'active', 'createdAt'],
                properties: {
                    role: { enum: ['superadmin', 'agent'] },
                },
            },
        },
    });
    await createIndexes(db, 'adminUsers', [
        { key: { email: 1 }, unique: true, name: 'email_unique' },
    ]);

    // ──────────────────────────── AUDIT LOGS ────────────────────────────
    await createCollection(db, 'auditLogs', {
        capped: false, // Not capped — must be immutable and complete
    });
    await createIndexes(db, 'auditLogs', [
        { key: { actorId: 1 }, name: 'actorId' },
        { key: { targetId: 1 }, name: 'targetId' },
        { key: { action: 1 }, name: 'action' },
        { key: { createdAt: -1 }, name: 'createdAt_desc' },
    ]);

    // ──────────────────────────── EMAIL LOGS ────────────────────────────
    await createCollection(db, 'emailLogs', {});
    await createIndexes(db, 'emailLogs', [
        { key: { relatedApplicationId: 1 }, name: 'relatedApplicationId', sparse: true },
        { key: { sentAt: -1 }, name: 'sentAt_desc' },
    ]);

    // ──────────────────────────── SETTINGS ────────────────────────────
    await createCollection(db, 'settings', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['key', 'value'],
            },
        },
    });
    await createIndexes(db, 'settings', [
        { key: { key: 1 }, unique: true, name: 'key_unique' },
    ]);

    console.log('\n✅ Database setup completed successfully!');
    await client.close();
}

async function createCollection(db: any, name: string, options: any) {
    try {
        const existing = await db.listCollections({ name }).toArray();
        if (existing.length === 0) {
            await db.createCollection(name, options);
            console.log(`  ✅ Created collection: ${name}`);
        } else {
            // Apply validator update if collection exists
            if (options.validator) {
                await db.command({ collMod: name, validator: options.validator, validationLevel: 'moderate' });
            }
            console.log(`  ⏭️  Collection already exists: ${name} (updated validator)`);
        }
    } catch (err: any) {
        if (err.code !== 48) throw err; // 48 = NamespaceExists
        console.log(`  ⏭️  Skipped: ${name}`);
    }
}

async function createIndexes(db: any, collection: string, indexes: IndexDescription[]) {
    try {
        await db.collection(collection).createIndexes(indexes);
        console.log(`     📑 Indexes created for ${collection}`);
    } catch (err: any) {
        console.warn(`     ⚠️  Index warning for ${collection}:`, err.message);
    }
}

setup().catch((err) => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});
