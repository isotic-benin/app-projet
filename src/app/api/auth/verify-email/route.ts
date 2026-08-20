import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return new NextResponse('Token manquant', { status: 400 });
        }

        const db = await getDb();
        const usersCol = db.collection(COLLECTIONS.USERS);

        const user = await usersCol.findOne({
            _verificationToken: token,
            _verificationTokenExpiresAt: { $gt: new Date() },
        });

        if (!user) {
            return new NextResponse(
                `
        <html><head><title>Erreur</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Lien invalide ou expiré</h2>
          <p>Le lien de vérification est invalide ou a expiré. Veuillez vous reconnecter pour demander un nouveau lien.</p>
          <a href="/connexion">Retour à la connexion</a>
        </body></html>
        `,
                { headers: { 'Content-Type': 'text/html' }, status: 400 }
            );
        }

        // Mark as verified and remove tokens
        await usersCol.updateOne(
            { _id: user._id },
            {
                $set: {
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                    updatedAt: new Date(),
                },
                $unset: {
                    _verificationToken: '',
                    _verificationTokenExpiresAt: '',
                },
            }
        );

        // Audit Log
        await writeAuditLog({
            actorType: 'client',
            actorId: user._id,
            action: AUDIT_ACTIONS.USER_EMAIL_VERIFIED,
            targetType: 'user',
            targetId: user._id,
        });

        // Return success page
        return new NextResponse(
            `
      <html><head><title>Succès</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #0082f0;">Votre email a été vérifié avec succès !</h2>
        <p>Merci ${user.firstName}. Vous pouvez maintenant procéder à la sécurisation de votre compte.</p>
        <a href="/connexion" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #0082f0; color: white; text-decoration: none; border-radius: 5px;">Accéder à mon espace</a>
      </body></html>
      `,
            { headers: { 'Content-Type': 'text/html' } }
        );

    } catch (err: any) {
        console.error('[VERIFY EMAIL ERROR]', err);
        return new NextResponse('Erreur interne', { status: 500 });
    }
}
