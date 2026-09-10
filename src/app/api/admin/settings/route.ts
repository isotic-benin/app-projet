import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { settingsUpdateSchema } from '@/lib/validators';
import { isValidRibOrIban, isValidBIC } from '@/lib/bank-validation';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const db = await getDb();
    const settings = await db.collection(COLLECTIONS.SETTINGS).find({}).toArray();
    const map: Record<string, any> = {};
    settings.forEach((s: any) => (map[s.key] = s.value));
    return NextResponse.json({ settings: map, raw: settings });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const body = await req.json();
    // body peut être { key, value } ou { bank: { holder, iban, bic, name, instructions } } ou full map
    const db = await getDb();

    // Format normalisé : supporte { iban, holder, bic, name, instructions }
    if (body.bank) {
        const { holder, iban, bic, name, instructions } = body.bank;
        if (!holder || String(holder).trim().length < 2) return NextResponse.json({ error: 'Titulaire requis (min 2 caractères).' }, { status: 400 });
        const ribCheck = isValidRibOrIban(String(iban || ''));
        if (!ribCheck.valid) return NextResponse.json({ error: ribCheck.error || 'IBAN/RIB invalide.' }, { status: 400 });
        if (bic && String(bic).trim() && !isValidBIC(String(bic))) return NextResponse.json({ error: 'BIC invalide (8 ou 11 caractères).' }, { status: 400 });

        const updates: Record<string, string> = {
            guarantee_bank_holder: String(holder).trim(),
            guarantee_bank_iban: ribCheck.normalized,
            guarantee_bank_bic: String(bic || '').trim().toUpperCase(),
            guarantee_bank_name: String(name || '').trim(),
            guarantee_bank_instructions: String(instructions || '').trim(),
        };
        for (const [key, value] of Object.entries(updates)) {
            await db.collection(COLLECTIONS.SETTINGS).updateOne(
                { key },
                { $set: { key, value, updatedAt: new Date(), updatedBy: session.user.id } },
                { upsert: true }
            );
        }
        await writeAuditLog({
            actorType: 'admin',
            actorId: session.user.id as any,
            action: AUDIT_ACTIONS.SETTINGS_UPDATED,
            targetType: 'settings',
            targetId: session.user.id as any,
            metadata: { keys: Object.keys(updates) },
        } as any);
        return NextResponse.json({ success: true });
    }

    // Fallback single key/value
    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Payload invalide', details: parsed.error.errors }, { status: 400 });
    const { key, value } = parsed.data;

    // Validation spécifique si c'est un champ bancaire
    if (key === 'guarantee_bank_iban') {
        const check = isValidRibOrIban(String(value));
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });
    }
    if (key === 'guarantee_bank_bic' && String(value).trim() && !isValidBIC(String(value))) {
        return NextResponse.json({ error: 'BIC invalide.' }, { status: 400 });
    }

    await db.collection(COLLECTIONS.SETTINGS).updateOne(
        { key },
        { $set: { key, value, updatedAt: new Date(), updatedBy: session.user.id } },
        { upsert: true }
    );
    await writeAuditLog({
        actorType: 'admin',
        actorId: session.user.id as any,
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        targetType: 'settings',
        targetId: session.user.id as any,
        metadata: { key, value },
    } as any);
    return NextResponse.json({ success: true });
}
