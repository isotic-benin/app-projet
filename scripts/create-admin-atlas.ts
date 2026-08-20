import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI!;
const email = (process.env.ADMIN_INITIAL_EMAIL ?? '').toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD ?? '';
const name = process.env.ADMIN_INITIAL_NAME ?? 'Super Admin';

const TARGET = process.argv[2] ?? 'altiafinance';

async function main() {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connecté à MongoDB Atlas');

    const { databases } = await client.db().admin().listDatabases();
    const names = databases.map((d) => d.name);
    console.log('📦 Bases présentes sur Atlas :', names.length ? names.join(', ') : '(aucune)');

    const target = TARGET;
    console.log(`🎯 Base ciblée : ${target}`);

    const db = client.db(target);
    const hash = bcrypt.hashSync(password, 10);

    await db.collection('adminUsers').updateOne(
        { email },
        {
            $set: {
                name,
                passwordHash: hash,
                role: 'superadmin',
                active: true,
                updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
    );

    const admin = await db.collection('adminUsers').findOne({ email });
    if (!admin) throw new Error('Admin introuvable après insertion');
    const ok = bcrypt.compareSync(password, admin.passwordHash);

    console.log('👤 Admin créé/mis à jour :');
    console.log(`   Email   : ${admin.email}`);
    console.log(`   Nom     : ${admin.name}`);
    console.log(`   Rôle    : ${admin.role}`);
    console.log(`   Actif   : ${admin.active}`);
    console.log(`   Mot de passe valide (bcrypt) : ${ok}`);
    console.log(`   Base    : ${target}`);
    console.log(`   Collection : adminUsers`);

    await client.close();
}

main().catch((err) => {
    console.error('❌ Échec :', err);
    process.exit(1);
});
