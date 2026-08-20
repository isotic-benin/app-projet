const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb://localhost:27017/cred';
const DB_NAME = 'altiafinance';

function generateClientNumber(index) {
    return `CL-2026-${String(index).padStart(6, '0')}`;
}

function hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, 10);
}

async function seed() {
    console.log('🌱 Starting direct seed...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Settings
    console.log('\n📋 Seeding settings...');
    const settingsCol = db.collection('settings');
    const defaultSettings = [
        { key: 'initial_deposit_amount', value: 10000, updatedAt: new Date(), updatedBy: null },
        { key: 'guarantee_deposit_percentage', value: 10, updatedAt: new Date(), updatedBy: null },
        { key: 'guarantee_deposit_deadline_days', value: 14, updatedAt: new Date(), updatedBy: null },
        { key: 'currency', value: 'XOF', updatedAt: new Date(), updatedBy: null },
        { key: 'platform_name', value: 'Altia Finance', updatedAt: new Date(), updatedBy: null },
        { key: 'support_email', value: 'support@altiafinance.com', updatedAt: new Date(), updatedBy: null },
    ];
    for (const setting of defaultSettings) {
        await settingsCol.updateOne(
            { key: setting.key },
            { $setOnInsert: setting },
            { upsert: true }
        );
    }
    console.log('  ✅ Settings configured.');

    // Products
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

    const adminHash = hashPassword('Admin2024!');
    const clientHash = hashPassword('Client2024!');

    console.log('\n👤 Seeding admin user...');
    const adminCol = db.collection('adminUsers');
    const adminEmail = 'admin@altiafinance.com';

    // Nuke old admin so it creates with exact crypto hash
    await adminCol.deleteMany({ email: adminEmail });
    await adminCol.insertOne(
        {
            name: 'Super Admin',
            email: adminEmail,
            passwordHash: adminHash,
            role: 'superadmin',
            active: true,
            updatedAt: new Date(),
            createdAt: new Date()
        }
    );
    console.log(`  ✅ Admin updated.`);

    console.log('\n👥 Seeding dummy clients and loans...');
    const usersCol = db.collection('users');
    const loansCol = db.collection('loanApplications');

    const clients = [
        { idx: 1, fname: 'Jean', lname: 'Sans-KYC', email: 'jean@test.com', status: 'not_started' },
        { idx: 2, fname: 'Marie', lname: 'En-Attente-KYC', email: 'marie@test.com', status: 'pending' },
        { idx: 3, fname: 'Paul', lname: 'Pret-En-Attente', email: 'paul@test.com', status: 'verified', loanStatus: 'decision_pending' },
        { idx: 4, fname: 'Sophie', lname: 'Attente-Garantie', email: 'sophie@test.com', status: 'verified', loanStatus: 'approved_pending_guarantee' },
        { idx: 5, fname: 'Luc', lname: 'Pret-A-Decaisser', email: 'luc@test.com', status: 'verified', loanStatus: 'guarantee_paid' },
        { idx: 6, fname: 'Julie', lname: 'Remboursement-Actif', email: 'julie@test.com', status: 'verified', loanStatus: 'disbursed' },
    ];

    for (const c of clients) {
        await usersCol.deleteMany({ email: c.email });

        const userId = new ObjectId();
        let kycData = { status: c.status };
        if (c.status !== 'not_started') {
            kycData.documents = [
                { type: 'cni', url: '#dummy', uploadedAt: new Date() },
                { type: 'paySlip', url: '#dummy', uploadedAt: new Date() },
            ];
        }

        await usersCol.insertOne({
            _id: userId,
            clientNumber: generateClientNumber(c.idx),
            firstName: c.fname,
            lastName: c.lname,
            email: c.email,
            phone: `+229 9000000${c.idx}`,
            passwordHash: clientHash,
            emailVerified: true,
            nationalIdType: 'cni',
            nationalIdNumber: 'Encrypted-Dummy-ID-0000',
            dateOfBirth: new Date('1990-01-01'),
            profession: 'Employé Test',
            monthlyIncome: 450000,
            kyc: kycData,
            initialDeposit: {
                status: 'paid',
                amount: 1000000,
                paidAt: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        if (c.loanStatus) {
            await loansCol.deleteMany({ userId: userId });
            const amount = 50000000;
            const application = {
                applicationNumber: `LN-${Date.now().toString().slice(-6)}-${c.idx}`,
                userId: userId,
                productSlug: 'pret-personnel',
                productName: 'Prêt Personnel',
                amount: amount,
                duration: 12,
                annualRate: 14.5,
                purpose: "Achat d'ordinateur pour dev",
                status: c.loanStatus,
                statusHistory: [
                    { status: 'submitted', changedAt: new Date(), changedBy: userId, note: 'Demande initiale' }
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            if (['approved_pending_guarantee', 'guarantee_paid', 'disbursed'].includes(c.loanStatus)) {
                application.guaranteeDeposit = {
                    required: amount * 0.10,
                    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
        }
        console.log(`  ✅ Client created: ${c.email}`);
    }

    console.log('\n🎉 Comprehensive Direct Seed completed successfully!');
    await client.close();
}

seed().catch((err) => {
    console.error('❌ Direct Seed failed:', err);
    process.exit(1);
});
