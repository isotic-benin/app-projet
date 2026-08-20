import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
        }

        const db = await getDb();
        const usersCol = db.collection(COLLECTIONS.USERS);

        // Find user by email (case-insensitive)
        const user = await usersCol.findOne({ email: new RegExp(`^${email}$`, 'i') });

        if (!user) {
            // Repondre success de toute façon pour éviter l'énumération de comptes
            return NextResponse.json({ success: true, message: 'Si un compte existe avec cet email, un lien a été envoyé.' });
        }

        // Generate a cryptographically secure token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before storing it for better security (optional but good practice)
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

        await db.collection(COLLECTIONS.PASSWORD_RESETS).insertOne({
            userId: user._id,
            email: user.email,
            tokenHash,
            expiresAt,
            used: false,
            createdAt: new Date()
        });

        // Send the raw unhashed token via email
        try {
            await sendPasswordResetEmail(user.email, user.firstName || 'Client', resetToken);
        } catch (e) {
            console.error('[FORGOT_PASSWORD_EMAIL_ERROR]', e);
            // On ne bloque pas si l'email échoue occasionnellement
        }

        return NextResponse.json({ success: true, message: 'Si un compte existe avec cet email, un lien a été envoyé.' });
    } catch (error) {
        console.error('[FORGOT_PASSWORD_API_ERROR]', error);
        return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
}
