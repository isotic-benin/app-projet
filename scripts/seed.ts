import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'altiafinance';

function generateClientNumber(index: number): string {
    return `CL-2026-${String(index).padStart(6, '0')}`;
}

function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

async function seed() {
    console.log('🌱 Starting comprehensive seed with Crypto (scrypt)...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // ──────────────────── SETTINGS ────────────────────
    console.log('\n📋 Seeding settings...');
    const settingsCol = db.collection('settings');
    const defaultSettings = [
        { key: 'initial_deposit_amount', value: 10000, updatedAt: new Date(), updatedBy: null },
        { key: 'guarantee_deposit_percentage', value: 10, updatedAt: new Date(), updatedBy: null },
        { key: 'guarantee_deposit_deadline_days', value: 14, updatedAt: new Date(), updatedBy: null },
        { key: 'currency', value: 'XOF', updatedAt: new Date(), updatedBy: null },
        { key: 'platform_name', value: 'Altia Finance', updatedAt: new Date(), updatedBy: null },
        { key: 'support_email', value: process.env.EMAIL_FROM ?? 'support@altiafinance.com', updatedAt: new Date(), updatedBy: null },
    ];
    for (const setting of defaultSettings) {
        await settingsCol.updateOne(
            { key: setting.key },
            { $setOnInsert: setting },
            { upsert: true }
        );
    }
    console.log('  ✅ Settings configured.');

    // ──────────────────── LOAN PRODUCTS ────────────────────
    console.log('\n🏦 Seeding loan products...');
    const productsCol = db.collection('loanProducts');
    const products = [
        {
            slug: 'pret-personnel', name: 'Prêt Personnel', category: 'personnel',
            description: 'Financez tous vos projets personnels.',
            minAmount: 10000000, maxAmount: 500000000, minDurationMonths: 6, maxDurationMonths: 60,
            annualInterestRate: 14.5, taeg: 16.2, requiredDocuments: ['id_card_front', 'id_card_back', 'proof_of_address', 'payslip_3months'],
            active: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            slug: 'pret-auto', name: 'Prêt Auto', category: 'auto',
            description: 'Achetez votre véhicule neuf ou d\'occasion.',
            minAmount: 20000000, maxAmount: 1500000000, minDurationMonths: 12, maxDurationMonths: 84,
            annualInterestRate: 13.5, taeg: 15.1, requiredDocuments: [],
            active: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            slug: 'pret-travaux', name: 'Prêt Travaux', category: 'travaux',
            description: 'Financez vos travaux de construction ou de rénovation.',
            minAmount: 5000000, maxAmount: 50000000, minDurationMonths: 12, maxDurationMonths: 72,
            annualInterestRate: 15.0, taeg: 16.8, requiredDocuments: [],
            active: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            slug: 'mini-pret', name: 'Mini Prêt Express', category: 'mini_pret',
            description: 'Un coup de pouce rapide pour une dépense imprévue.',
            minAmount: 1000000, maxAmount: 50000000, minDurationMonths: 1, maxDurationMonths: 12,
            annualInterestRate: 18.0, taeg: 20.5, requiredDocuments: [],
            active: true, createdAt: new Date(), updatedAt: new Date(),
        },
    ];

    for (const product of products) {
        await productsCol.updateOne({ slug: product.slug }, { $setOnInsert: product }, { upsert: true });
    }
    console.log('  ✅ Loan products configured.');

    const adminPasswordRaw = 'Admin2024!';
    const clientPasswordRaw = 'Client2024!';
    console.log('\n🔑 Hashing passwords...');

    // Hash passwords using crypto scryptSync
    const adminHash = hashPassword(adminPasswordRaw);
    const clientHash = hashPassword(clientPasswordRaw);

    // ──────────────────── ADMIN USER ────────────────────
    console.log('\n👤 Seeding admin user...');
    const adminCol = db.collection('adminUsers');
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL ?? 'admin@altiafinance.com';

    await adminCol.updateOne(
        { email: adminEmail },
        {
            $set: {
                name: 'Super Admin',
                passwordHash: adminHash, // Update with new scrypt hash!
                role: 'superadmin',
                active: true,
                updatedAt: new Date()
            }
        },
        { upsert: true }
    );
    console.log(`  ✅ Admin created/updated: ${adminEmail} (password: ${adminPasswordRaw})`);

    // ──────────────────── CLIENT USERS & LOANS ────────────────────
    console.log('\n👥 Seeding dummy clients and loans...');
    const usersCol = db.collection('users');
    const loansCol = db.collection('loanApplications');

    // MOCK DATA GENERATOR
    const clients = [
        { idx: 1, fname: 'Jean', lname: 'Sans-KYC', email: 'jean@test.com', status: 'not_started' },
        { idx: 2, fname: 'Marie', lname: 'En-Attente-KYC', email: 'marie@test.com', status: 'pending' },
        { idx: 3, fname: 'Paul', lname: 'Pret-En-Attente', email: 'paul@test.com', status: 'verified', loanStatus: 'decision_pending' },
        { idx: 4, fname: 'Sophie', lname: 'Attente-Garantie', email: 'sophie@test.com', status: 'verified', loanStatus: 'approved_pending_guarantee' },
        { idx: 5, fname: 'Luc', lname: 'Pret-A-Decaisser', email: 'luc@test.com', status: 'verified', loanStatus: 'guarantee_paid' },
        { idx: 6, fname: 'Julie', lname: 'Remboursement-Actif', email: 'julie@test.com', status: 'verified', loanStatus: 'disbursed' },
    ];

    for (const c of clients) {
        const userId = new ObjectId();

        let kycData: any = { status: c.status };
        if (c.status !== 'not_started') {
            kycData.documents = [
                { type: 'cni', url: '#dummy', uploadedAt: new Date() },
                { type: 'paySlip', url: '#dummy', uploadedAt: new Date() },
            ];
        }

        // Upsert user based on email so we don't duplicate on repeated seed
        const existingUser = await usersCol.findOne({ email: c.email });
        const finalUserId = existingUser ? existingUser._id : userId;

        if (!existingUser) {
            await usersCol.insertOne({
                _id: finalUserId,
                clientNumber: generateClientNumber(c.idx),
                firstName: c.fname,
                lastName: c.lname,
                email: c.email,
                phone: `+229 9000000${c.idx}`,
                passwordHash: clientHash,
                emailVerified: true, // Auto verified
                nationalIdType: 'cni',
                nationalIdNumber: 'Encrypted-Dummy-ID-0000',
                dateOfBirth: new Date('1990-01-01'),
                profession: 'Employé Test',
                monthlyIncome: 450000,
                kyc: kycData,
                initialDeposit: {
                    status: 'paid',
                    amount: 1000000, // 10k FCFA
                    paidAt: new Date()
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`  ✅ Client created: ${c.email} (KYC: ${c.status})`);
        } else {
            await usersCol.updateOne(
                { _id: finalUserId },
                { $set: { kyc: kycData, passwordHash: clientHash } } // Force update to new scrypt hash 
            );
        }

        // CREATE A DUMMY LOAN IF NEEDED
        if (c.loanStatus) {
            const hasLoan = await loansCol.findOne({ userId: finalUserId });
            if (!hasLoan) {
                const amount = 50000000; // 500k FCFA

                const application = {
                    applicationNumber: `LN-${Date.now().toString().slice(-6)}-${c.idx}`,
                    userId: finalUserId,
                    productSlug: 'pret-personnel',
                    productName: 'Prêt Personnel',
                    amount: amount,
                    duration: 12,
                    annualRate: 14.5,
                    purpose: "Achat d'ordinateur pour dev",
                    status: c.loanStatus,
                    statusHistory: [
                        { status: 'submitted', changedAt: new Date(), changedBy: finalUserId, note: 'Demande initiale' }
                    ],
                    guaranteeDeposit: undefined,
                    disbursement: undefined,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any;

                if (['approved_pending_guarantee', 'guarantee_paid', 'disbursed'].includes(c.loanStatus)) {
                    application.guaranteeDeposit = {
                        required: amount * 0.10, // 10%
                        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
                        status: c.loanStatus === 'approved_pending_guarantee' ? 'pending' : 'paid'
                    };
                    application.statusHistory.push({ status: 'approved_pending_guarantee', changedAt: new Date(), changedBy: 'admin', note: 'Approuvé' });
                }

                if (c.loanStatus === 'guarantee_paid') {
                    application.guaranteeDeposit.paidAt = new Date();
                    application.guaranteeDeposit.txReference = 'PAY-DEMO-123';
                }

                if (c.loanStatus === 'disbursed') {
                    application.disbursement = { method: 'bank_transfer', disbursedAt: new Date(), reference: 'V-DEMO-456' };
                }

                await loansCol.insertOne(application);
                console.log(`     ↳ Loan added: ${c.loanStatus}`);
            }
        }
    }

    console.log('\n🎉 Comprehensive Seed completed successfully!');
    console.log('----------------------------------------------------');
    console.log('🔗 UTILISATEURS POUR TEST');
    console.log(`👮 Admin      : admin@altiafinance.com / Admin2024!`);
    console.log(`👤 Client (A) : marie@test.com   / Client2024! (KYC en attente)`);
    console.log(`👤 Client (B) : paul@test.com    / Client2024! (Prêt en attente)`);
    console.log(`👤 Client (C) : sophie@test.com  / Client2024! (Attente Garantie)`);
    console.log(`👤 Client (D) : luc@test.com     / Client2024! (Prêt à décaisser)`);
    console.log('----------------------------------------------------');
    await client.close();
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
