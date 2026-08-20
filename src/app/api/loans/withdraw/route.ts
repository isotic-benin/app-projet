import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { amount, method, reference } = body;

        const amountCents = Math.round(Number(amount) * 100);
        if (!amountCents || amountCents < 100) {
            return NextResponse.json({ error: 'Montant de retrait invalide (minimum 1 €).' }, { status: 400 });
        }
        if (!['bank_transfer', 'mobile_money'].includes(method)) {
            return NextResponse.json({ error: 'Mode de retrait invalide.' }, { status: 400 });
        }
        if (!reference || String(reference).trim().length < 4) {
            return NextResponse.json({ error: 'Veuillez indiquer vos coordonnées de réception (IBAN ou numéro Mobile Money).' }, { status: 400 });
        }

        const db = await getDb();
        const userId = new ObjectId(session.user.id);

        const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
        const balance = user?.accountBalance || 0;

        if (amountCents > balance) {
            return NextResponse.json({ error: 'Solde insuffisant pour effectuer ce retrait.' }, { status: 400 });
        }

        const now = new Date();

        // Bloquer les fonds : débiter immédiatement le solde
        await db.collection(COLLECTIONS.USERS).updateOne(
            { _id: userId },
            { $inc: { accountBalance: -amountCents }, $set: { updatedAt: now } }
        );

        const txResult = await db.collection(COLLECTIONS.TRANSACTIONS).insertOne({
            userId,
            type: 'withdrawal',
            amount: amountCents,
            status: 'pending',
            method,
            reference: String(reference).trim(),
            withdrawal: {
                requestedAt: now,
                requestedBy: userId,
            },
            createdAt: now,
        });

        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: AUDIT_ACTIONS.WITHDRAWAL_SUBMITTED,
            targetType: 'user',
            targetId: userId,
            metadata: { amount: amountCents, method, reference, transactionId: txResult.insertedId },
        });

        return NextResponse.json({
            success: true,
            message: 'Demande de retrait enregistrée. Vos fonds sont en cours de traitement (sous 24-48h).',
            transactionId: txResult.insertedId.toString(),
        });
    } catch (err: any) {
        console.error('[WITHDRAWAL ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}