import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import RetraitForm from './RetraitForm';

export default async function RetraitPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/connexion');

    const db = await getDb();
    const userId = new ObjectId(session.user.id);
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
    if (!user) redirect('/connexion');

    const pendingWithdrawals = await db
        .collection(COLLECTIONS.TRANSACTIONS)
        .find({ userId, type: 'withdrawal' })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

    return (
        <div className="space-y-6">
            <RetraitForm balance={user.accountBalance || 0} />

            {pendingWithdrawals.length > 0 && (
                <div className="max-w-lg mx-auto bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-gray-50/50">
                        <h2 className="font-bold text-navy">Demandes de retrait</h2>
                    </div>
                    <ul className="divide-y divide-border">
                        {pendingWithdrawals.map((tx: any) => (
                            <li key={tx._id.toString()} className="px-6 py-4 flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-bold text-navy font-mono">
                                        -{(tx.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {tx.method === 'mobile_money' ? 'Mobile Money' : 'Virement bancaire'} · {tx.reference || ''}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tx.status === 'validated' ? 'bg-green-100 text-green-700' :
                                    tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {tx.status === 'validated' ? 'Validé' : tx.status === 'pending' ? 'En cours' : 'Rejeté'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}