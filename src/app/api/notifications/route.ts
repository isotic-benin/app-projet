import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const db = await getDb();
        const notifications = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .find({ userId: new ObjectId(session.user.id) })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        const unreadCount = await db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({
            userId: new ObjectId(session.user.id),
            read: false,
        });

        const safe = notifications.map(n => ({
            id: n._id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.read,
            createdAt: n.createdAt,
        }));

        return NextResponse.json({ notifications: safe, unreadCount });
    } catch (err: any) {
        console.error('[NOTIFICATIONS LIST ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}