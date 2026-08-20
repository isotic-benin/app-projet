import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import DashboardShell from './DashboardShell';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'client') {
        redirect('/connexion');
    }

    const db = await getDb();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(session.user.id) });

    const unreadCount = await db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({
        userId: new ObjectId(session.user.id),
        read: false,
    });

    const safeUser = JSON.parse(JSON.stringify(user));

    return <DashboardShell user={safeUser} unreadCount={unreadCount}>{children}</DashboardShell>;
}
