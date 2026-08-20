import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const db = await getDb();
        const userId = new ObjectId(session.user.id);
        const body = await req.json().catch(() => ({}));
        const { id } = body;

        const filter: any = { userId, read: false };

        if (id) {
            try {
                filter._id = new ObjectId(id);
            } catch {
                return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
            }
        }

        await db.collection(COLLECTIONS.NOTIFICATIONS).updateMany(
            filter,
            { $set: { read: true, readAt: new Date() } }
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[NOTIFICATIONS READ ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}