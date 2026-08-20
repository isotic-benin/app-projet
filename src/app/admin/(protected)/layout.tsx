import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboardShell from './AdminDashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
        redirect('/admin/login');
    }

    return (
        <AdminDashboardShell user={session.user}>
            {children}
        </AdminDashboardShell>
    );
}
