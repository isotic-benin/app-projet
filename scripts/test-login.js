const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/cred';
const DB_NAME = 'microfinance';

async function check() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("Connected to DB:", DB_NAME);

    console.log("\n=== ALL ADMIN ACCOUNTS ===");
    const allAdmins = await db.collection('adminUsers').find({}).toArray();
    console.log("Total admin accounts:", allAdmins.length);
    for (const a of allAdmins) {
        console.log(`  Email: ${a.email}`);
        console.log(`  Active: ${a.active}`);
        console.log(`  Role: ${a.role}`);
        console.log(`  Hash: ${a.passwordHash}`);
        try {
            const valid = bcrypt.compareSync('Admin2024!', a.passwordHash);
            console.log(`  bcrypt.compare('Admin2024!') => ${valid}`);
        } catch (e) {
            console.log(`  bcrypt.compare FAILED: ${e.message}`);
        }
        console.log('---');
    }

    console.log("\n=== LATEST 3 CLIENT ACCOUNTS ===");
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log("Total shown:", users.length);
    for (const u of users) {
        console.log(`  Email: ${u.email}`);
        console.log(`  emailVerified: ${u.emailVerified}`);
        console.log(`  Hash: ${u.passwordHash?.substring(0, 30)}...`);
        try {
            const valid = bcrypt.compareSync('Client2024!', u.passwordHash);
            console.log(`  bcrypt.compare('Client2024!') => ${valid}`);
        } catch (e) {
            console.log(`  bcrypt.compare FAILED: ${e.message}`);
        }
        console.log('---');
    }

    await client.close();
    process.exit(0);
}
check().catch(err => { console.error(err); process.exit(1); });
