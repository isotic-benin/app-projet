import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import { generateToken } from '@/lib/crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email requis' }, { status: 400 });
        }
        const db = await getDb();
        const user = await db.collection(COLLECTIONS.USERS).findOne({ email: String(email).toLowerCase() });
        if (!user) return NextResponse.json({ error: 'Aucun compte trouvé avec cet email.' }, { status: 404 });
        if (user.emailVerified) return NextResponse.json({ error: 'Ce compte est déjà vérifié.' }, { status: 400 });

        const token = generateToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.collection(COLLECTIONS.USERS).updateOne(
            { _id: user._id },
            { $set: { _verificationToken: token, _verificationTokenExpiresAt: expires, updatedAt: new Date() } }
        );

        // Envoi immédiat + retry léger
        const sendWithRetry = async (attempt = 1): Promise<any> => {
            const res = await sendVerificationEmail(user.email, user.firstName, token);
            if (!res.success && attempt < 2) {
                await new Promise(r => setTimeout(r, 600));
                return sendWithRetry(attempt + 1);
            }
            return res;
        };
        const result = await sendWithRetry();

        const verifyLink = `${(process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/auth/verify-email?token=${token}`;

        if (!result.success) {
            return NextResponse.json({ error: 'Échec envoi email, réessayez. ' + (result.error?.message || ''), verifyLink }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Email renvoyé', verifyLink });
    } catch (e: any) {
        console.error('[RESEND VERIFY ERROR]', e);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
