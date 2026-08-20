import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'Token invalide ou mot de passe trop court (min 8 caractères)' }, { status: 400 });
        }

        const db = await getDb();
        const tokensCol = db.collection(COLLECTIONS.PASSWORD_RESETS);
        const usersCol = db.collection(COLLECTIONS.USERS);
        const now = new Date();

        // Hash the input token to compare with DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the valid token
        const resetRecord = await tokensCol.findOne({
            tokenHash,
            used: false,
            expiresAt: { $gt: now }
        });

        if (!resetRecord) {
            return NextResponse.json({ error: 'Le lien est invalide ou a expiré' }, { status: 400 });
        }

        // Hash the new password with bcrypt as used in the project
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update the client user
        const updateResult = await usersCol.updateOne(
            { _id: resetRecord.userId },
            {
                $set: {
                    passwordHash,
                    updatedAt: now
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        // Invalidate the token
        await tokensCol.updateOne(
            { _id: resetRecord._id },
            { $set: { used: true, usedAt: now } }
        );

        return NextResponse.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('[RESET_PASSWORD_API_ERROR]', error);
        return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
}
