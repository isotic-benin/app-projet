import { getDb, COLLECTIONS } from '@/lib/db';
import Link from 'next/link';

export default async function KycPendingPage() {
    const db = await getDb();

    // Fetch users strictly requiring KYC verification
    const kycPendingUsers = await db.collection(COLLECTIONS.USERS)
        .find({ 'kyc.status': 'pending' })
        .sort({ 'kyc.documents.0.uploadedAt': 1 }) // First in first out
        .toArray();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">KYC en attente</h1>
                    <p className="text-gray-500 mt-1">Dossiers et pièces d'identité en attente de vérification manuelle.</p>
                </div>
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-navy">À traiter en priorité ({kycPendingUsers.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">N° Client</th>
                                <th className="px-6 py-4 font-semibold">Documents reçus le</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {kycPendingUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
                                            <span className="text-green-600 text-xl">✓</span>
                                        </div>
                                        <p className="text-navy font-semibold">Aucun dossier en attente</p>
                                        <p className="text-sm mt-1">Tout est à jour pour le moment.</p>
                                    </td>
                                </tr>
                            ) : (
                                kycPendingUsers.map((user) => (
                                    <tr key={user._id.toString()} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-navy">{user.firstName} {user.lastName}</div>
                                            <div className="text-gray-500 text-xs">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user.clientNumber}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {user.kyc.documents[0]?.uploadedAt
                                                ? new Date(user.kyc.documents[0].uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/utilisateurs/${user._id}/kyc`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 font-medium transition-colors"
                                            >
                                                Examiner les pièces
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
