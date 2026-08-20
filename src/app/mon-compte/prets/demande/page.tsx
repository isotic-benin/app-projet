import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import LoanApplicationForm from './LoanApplicationForm';

export default async function DemandePage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/connexion');

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
    if (!user) redirect('/connexion');

    return <LoanApplicationForm />;
}
