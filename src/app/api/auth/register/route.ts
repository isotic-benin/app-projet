import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import { registerUserSchema } from '@/lib/validators';
import { encrypt } from '@/lib/crypto';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate using Zod
        const data = registerUserSchema.parse(body);

        const db = await getDb();
        const usersCol = db.collection(COLLECTIONS.USERS);

        // Check if email or phone exists
        const [existingEmail, existingPhone] = await Promise.all([
            usersCol.findOne({ email: data.email.toLowerCase() }),
            usersCol.findOne({ phone: data.phone }),
        ]);

        if (existingEmail) {
            return NextResponse.json({ error: 'Cette adresse email est déjà utilisée.' }, { status: 400 });
        }
        if (existingPhone) {
            return NextResponse.json({ error: 'Ce numéro de téléphone est déjà utilisé.' }, { status: 400 });
        }

        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Generate Client Number (sequential approx, or random for MVP to avoid locking sequentially)
        const num = Math.floor(Math.random() * 900000) + 1000;
        const clientNumber = `CL-${new Date().getFullYear()}-${num}`;

        const newUserId = new ObjectId();

        // Vérification email désactivée en prod : compte directement actif et vérifié
        const userDoc = {
            _id: newUserId,
            clientNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email.toLowerCase(),
            emailVerified: true,
            emailVerifiedAt: new Date(),
            phone: data.phone,
            phoneVerified: false,
            passwordHash,
            dateOfBirth: new Date(data.dateOfBirth),
            nationalIdType: data.nationalIdType,
            // Encrypt sensitive PII
            nationalIdNumber: encrypt(data.nationalIdNumber),
            address: {
                street: encrypt(data.address.street),
                city: data.address.city,
                country: data.address.country,
            },
            profession: data.profession,
            monthlyIncome: data.monthlyIncome || null,
            kyc: {
                status: 'not_started',
                documents: [],
                reviewedBy: null,
                reviewedAt: null,
                rejectionReason: null,
            },
            status: 'active',
            twoFactorEnabled: false,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await usersCol.insertOne(userDoc);

        // Audit Log
        await writeAuditLog({
            actorType: 'system',
            actorId: null,
            action: AUDIT_ACTIONS.USER_REGISTERED,
            targetType: 'user',
            targetId: newUserId,
            metadata: { email: userDoc.email, autoVerified: true },
        });

        return NextResponse.json({
            success: true,
            message: 'Compte créé avec succès',
            userId: newUserId.toString(),
            email: data.email,
        }, { status: 201 });

    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ error: 'Données invalides', details: err.errors }, { status: 400 });
        }
        console.error('[REGISTER ERROR]', err);
        return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
}
