import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WithdrawalDecisionButtons from './WithdrawalDecisionButtons';

const TX_LABELS: Record<string, { label: string; color: string }> = {
    disbursement: { label: 'Déblocage prêt', color: 'text-green-600' },
    guarantee_deposit: { label: 'Garantie', color: 'text-amber-600' },
    withdrawal: { label: 'Retrait', color: 'text-red-600' },
};

export default async function UserDetailPage({ params }: { params: { id: string } }) {
    const db = await getDb();
    let userId: ObjectId;
    try {
        userId = new ObjectId(params.id);
    } catch {
        notFound();
    }

    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
    if (!user) notFound();

    const transactions = await db.collection(COLLECTIONS.TRANSACTIONS)
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    const loans = await db.collection(COLLECTIONS.LOAN_APPLICATIONS)
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

    const pendingWithdrawals = await db.collection(COLLECTIONS.TRANSACTIONS)
        .find({ userId, type: 'withdrawal', status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Link href="/admin/utilisateurs" className="text-sm text-gray-500 font-semibold mb-2 inline-block hover:text-primary-500">
                        ← Retour à la liste
                    </Link>
                    <h1 className="text-3xl font-extrabold text-navy">{user.firstName} {user.lastName}</h1>
                    <p className="text-gray-500 mt-1">{user.email} — N° {user.clientNumber || '—'}</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/admin/utilisateurs/${userId}/kyc`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 font-medium text-sm transition-colors"
                    >
                        Voir KYC
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                    <div className="text-gray-500 text-xs font-medium mb-1">Statut KYC</div>
                    <div>
                        {user.kyc?.status === 'verified' && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Vérifié</span>}
                        {user.kyc?.status === 'pending' && <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">En attente</span>}
                        {user.kyc?.status === 'rejected' && <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Rejeté</span>}
                        {(!user.kyc?.status || user.kyc?.status === 'not_started') && <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Non démarré</span>}
                    </div>
                </div>
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                    <div className="text-gray-500 text-xs font-medium mb-1">Compte</div>
                    <div>
                        {user.kyc?.status === 'verified' ? (
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Actif</span>
                        ) : (
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Inactif</span>
                        )}
                    </div>
                </div>
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                    <div className="text-gray-500 text-xs font-medium mb-1">Solde portefeuille</div>
                    <div className="text-lg font-bold text-navy font-mono">
                        {((user.accountBalance || 0) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                </div>
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                    <div className="text-gray-500 text-xs font-medium mb-1">Compte actif depuis</div>
                    <div className="text-lg font-bold text-navy">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                </div>
            </div>

            {/* Pending Withdrawals */}
            {pendingWithdrawals.length > 0 && (
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-border bg-amber-50/60">
                        <h2 className="text-lg font-bold text-navy">Demandes de retrait à traiter ({pendingWithdrawals.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                    <th className="px-6 py-4 font-semibold">Mode</th>
                                    <th className="px-6 py-4 font-semibold">Référence</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pendingWithdrawals.map((tx: any) => (
                                    <tr key={tx._id.toString()} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {new Date(tx.createdAt).toLocaleString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-navy">
                                            {(tx.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                        </td>
                                        <td className="px-6 py-4 text-navy">
                                            {tx.method === 'mobile_money' ? 'Mobile Money' : 'Virement bancaire'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{tx.reference || '—'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <WithdrawalDecisionButtons transactionId={tx._id.toString()} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Profile Info */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-gray-50/50">
                    <h2 className="text-lg font-bold text-navy">Informations personnelles</h2>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <span className="text-gray-500 font-medium">Nom complet</span>
                        <p className="text-navy font-semibold mt-0.5">{user.firstName} {user.lastName}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Email</span>
                        <p className="text-navy font-semibold mt-0.5">{user.email}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Téléphone</span>
                        <p className="text-navy font-semibold mt-0.5">{user.phone || '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">N° Client</span>
                        <p className="text-navy font-semibold mt-0.5 font-mono">{user.clientNumber || '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Profession</span>
                        <p className="text-navy font-semibold mt-0.5">{user.profession || '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Revenu mensuel</span>
                        <p className="text-navy font-semibold mt-0.5">{user.monthlyIncome ? `${(user.monthlyIncome / 100).toLocaleString('fr-FR')} €` : '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Date de naissance</span>
                        <p className="text-navy font-semibold mt-0.5">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR') : '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Inscription</span>
                        <p className="text-navy font-semibold mt-0.5">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-gray-50/50">
                    <h2 className="text-lg font-bold text-navy">Transactions récentes ({transactions.length})</h2>
                </div>
                {transactions.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">Aucune transaction.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                    <th className="px-6 py-4 font-semibold text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {transactions.map((tx: any) => {
                                    const tInfo = TX_LABELS[tx.type] || { label: tx.type, color: 'text-gray-600' };
                                    const isCredit = tx.type === 'disbursement';
                                    return (
                                        <tr key={tx._id.toString()} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className={`px-6 py-4 font-medium ${tInfo.color}`}>{tInfo.label}</td>
                                            <td className={`px-6 py-4 text-right font-mono font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                                {isCredit ? '+' : '-'}{(tx.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tx.status === 'completed' || tx.status === 'validated' ? 'bg-green-100 text-green-700' :
                                                    tx.status === 'under_review' || tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {tx.status === 'completed' || tx.status === 'validated' ? 'Validé' :
                                                        tx.status === 'under_review' || tx.status === 'pending' ? 'En cours' : 'Rejeté'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Loan Applications */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-gray-50/50">
                    <h2 className="text-lg font-bold text-navy">Demandes de prêt ({loans.length})</h2>
                </div>
                {loans.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">Aucune demande de prêt.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">N° Dossier</th>
                                    <th className="px-6 py-4 font-semibold">Produit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                    <th className="px-6 py-4 font-semibold">Statut</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loans.map((app: any) => (
                                    <tr key={app._id.toString()} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{app.applicationNumber}</td>
                                        <td className="px-6 py-4 text-navy font-medium">{app.productName}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-navy">
                                            {(app.amount / 100).toLocaleString('fr-FR')} €
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${app.status === 'under_review' ? 'bg-purple-100 text-purple-700' :
                                                app.status === 'approved_pending_guarantee' ? 'bg-green-100 text-green-700' :
                                                    app.status === 'disbursed' ? 'bg-blue-100 text-blue-700' :
                                                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {app.status === 'under_review' ? 'En analyse' :
                                                    app.status === 'approved_pending_guarantee' ? 'Approuvé' :
                                                        app.status === 'disbursed' ? 'Débloqué' :
                                                            app.status === 'rejected' ? 'Rejeté' : app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/prets/${app._id}`}
                                                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-gray-50 text-navy font-medium text-xs transition-colors border border-border"
                                            >
                                                Voir
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
