import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ObjectId } from 'mongodb';
import { isValidRibOrIban, isValidBIC, formatIbanForDisplay } from '@/lib/bank-validation';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { amount, method = 'bank_transfer', reference, iban, bic, accountHolder, bankName } = body;

        const amountCents = Math.round(Number(amount) * 100);
        if (!amountCents || amountCents < 100) {
            return NextResponse.json({ error: 'Montant de retrait invalide (minimum 1 €).' }, { status: 400 });
        }
        if (method !== 'bank_transfer') {
            return NextResponse.json({ error: 'Seul le virement bancaire est disponible.' }, { status: 400 });
        }

        // RIB / IBAN : accepte reference (legacy) ou iban
        const rawIban = String(iban || reference || '').trim();
        if (!rawIban) {
            return NextResponse.json({ error: 'Veuillez renseigner votre IBAN ou RIB.' }, { status: 400 });
        }

        const ribCheck = isValidRibOrIban(rawIban);
        if (!ribCheck.valid) {
            return NextResponse.json({ error: ribCheck.error || 'IBAN / RIB invalide.' }, { status: 400 });
        }

        const normalizedIban = ribCheck.normalized;
        const formattedIban = ribCheck.type === 'IBAN' ? formatIbanForDisplay(normalizedIban) : normalizedIban;

        // Titulaire
        const holder = String(accountHolder || '').trim();
        if (!holder || holder.length < 2) {
            return NextResponse.json({ error: 'Veuillez indiquer le nom du titulaire du compte (au moins 2 caractères).' }, { status: 400 });
        }
        if (holder.length > 80) {
            return NextResponse.json({ error: 'Nom du titulaire trop long.' }, { status: 400 });
        }

        // BIC optionnel mais si fourni doit être valide
        const rawBic = String(bic || '').trim();
        if (rawBic && !isValidBIC(rawBic)) {
            return NextResponse.json({ error: 'BIC invalide — format attendu : 8 ou 11 caractères (ex: AGRIFRPP).' }, { status: 400 });
        }

        const cleanBic = rawBic ? rawBic.replace(/\s+/g, '').toUpperCase() : null;
        const cleanBankName = String(bankName || '').trim().slice(0, 80) || null;

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
            {
                $inc: { accountBalance: -amountCents },
                $set: {
                    updatedAt: now,
                    // Mémoriser les infos bancaires pour les prochains retraits (confort)
                    lastWithdrawalBankInfo: {
                        holder,
                        iban: normalizedIban,
                        ibanFormatted: formattedIban,
                        ibanType: ribCheck.type,
                        bic: cleanBic,
                        bankName: cleanBankName,
                        updatedAt: now,
                    },
                },
            }
        );

        const bankDetails = {
            holder,
            iban: normalizedIban,
            ibanFormatted: formattedIban,
            ibanType: ribCheck.type,
            bic: cleanBic,
            bankName: cleanBankName,
        };

        const txResult = await db.collection(COLLECTIONS.TRANSACTIONS).insertOne({
            userId,
            type: 'withdrawal',
            amount: amountCents,
            status: 'pending',
            method: 'bank_transfer',
            reference: formattedIban,
            bankDetails,
            withdrawal: {
                requestedAt: now,
                requestedBy: userId,
                bankDetails,
            },
            createdAt: now,
            updatedAt: now,
        });

        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: AUDIT_ACTIONS.WITHDRAWAL_SUBMITTED,
            targetType: 'user',
            targetId: userId,
            metadata: { amount: amountCents, method: 'bank_transfer', iban: normalizedIban, ibanType: ribCheck.type, transactionId: txResult.insertedId },
        });

        await createNotification({
            userId,
            type: NOTIFICATION_TYPES.WITHDRAWAL_SUBMITTED ?? 'withdrawal_submitted',
            title: 'Demande de retrait enregistrée',
            message: `Votre demande de retrait de ${(amountCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € vers ${formattedIban} a bien été prise en compte. Traitement sous 24-48h ouvrées.`,
            link: '/mon-compte/retrait',
        });

        return NextResponse.json({
            success: true,
            message: 'Demande de retrait enregistrée. Vos fonds sont en cours de traitement (sous 24-48h ouvrées). Vous recevrez une notification dès validation.',
            transactionId: txResult.insertedId.toString(),
        });
    } catch (err: any) {
        console.error('[WITHDRAWAL ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}