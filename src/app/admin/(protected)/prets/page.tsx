import { getDb, COLLECTIONS } from '@/lib/db';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    submitted: { label: 'Soumise', color: 'bg-blue-500/20 text-blue-400' },
    under_review: { label: 'En analyse', color: 'bg-purple-500/20 text-purple-400' },
    decision_pending: { label: 'Décision en attente', color: 'bg-amber-500/20 text-amber-400' },
    approved_pending_guarantee: { label: 'Approuvé', color: 'bg-green-500/20 text-green-400' },
    guarantee_paid: { label: 'Garanti', color: 'bg-emerald-500/20 text-emerald-400' },
    contract_signed: { label: 'Contrat signé - Garantie à verser', color: 'bg-amber-500/20 text-amber-300' },
    disbursed: { label: 'Débloqué', color: 'bg-primary-500/20 text-primary-400' },
    active: { label: 'Actif', color: 'bg-primary-500/20 text-primary-300' },
    completed: { label: 'Soldé', color: 'bg-green-500/20 text-green-300' },
    rejected: { label: 'Refusé', color: 'bg-red-500/20 text-red-400' },
    expired: { label: 'Expiré', color: 'bg-gray-500/20 text-gray-400' },
};

export default async function AdminLoansPage() {
    const db = await getDb();

    const applications = await db
        .collection(COLLECTIONS.LOAN_APPLICATIONS)
        .aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
        ])
        .toArray();

    // Stats
    const stats = {
        total: applications.length,
        pending: applications.filter((a) => ['submitted', 'under_review', 'decision_pending'].includes(a.status)).length,
        approved: applications.filter((a) => ['approved_pending_guarantee', 'guarantee_paid', 'contract_signed', 'disbursed', 'active'].includes(a.status)).length,
        rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-extrabold text-navy">Dossiers de Crédit</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-navy' },
                    { label: 'En traitement', value: stats.pending, color: 'text-amber-500' },
                    { label: 'Approuvés', value: stats.approved, color: 'text-green-500' },
                    { label: 'Refusés', value: stats.rejected, color: 'text-red-500' },
                ].map((s) => (
                    <div key={s.label} className="bg-white border border-border shadow-sm rounded-xl p-4">
                        <p className="text-gray-500 text-xs font-medium">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">N° Dossier</th>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">Produit</th>
                                <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                <th className="px-6 py-4 font-semibold">Durée</th>
                                <th className="px-6 py-4 font-semibold">Statut</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {applications.map((app) => {
                                const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: 'bg-gray-100 text-gray-600' };
                                return (
                                    <tr key={app._id.toString()} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{app.applicationNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-navy">{app.user.firstName} {app.user.lastName}</div>
                                            <div className="text-gray-500 text-xs">{app.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-navy">{app.productName}</td>
                                        <td className="px-6 py-4 text-right font-mono text-navy font-bold">{((app.amount || 0) / 100).toLocaleString('fr-FR')}</td>
                                        <td className="px-6 py-4 text-navy">{app.duration} mois</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/prets/${app._id}`}
                                                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-gray-50 text-navy font-medium text-xs transition-colors border border-border"
                                            >
                                                Examiner
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Aucun dossier de crédit pour le moment.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
