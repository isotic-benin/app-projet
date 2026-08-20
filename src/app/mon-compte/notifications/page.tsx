import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'client') redirect('/connexion');

    const db = await getDb();
    const notifications = await db.collection(COLLECTIONS.NOTIFICATIONS)
        .find({ userId: new ObjectId(session.user.id) })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

    const safe = notifications.map(n => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
    }));

    return <NotificationsClient notifications={safe} />;
}