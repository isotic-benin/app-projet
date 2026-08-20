import { getDb, COLLECTIONS } from '@/lib/db';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default async function UtilisateursPage() {
    const db = await getDb();

    const users = await db.collection(COLLECTIONS.USERS)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Comptes Clients</h1>
                    <p className="text-gray-500 mt-1">Gérez l'ensemble des inscriptions sur la plateforme.</p>
                </div>
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-navy">Tous les utilisateurs ({users.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">N° Client</th>
                                <th className="px-6 py-4 font-semibold">Statut KYC</th>
                                <th className="px-6 py-4 font-semibold">Compte</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Aucun client n'a été trouvé.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                        <tr key={user._id.toString()} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-navy">{user.firstName} {user.lastName}</div>
                                                <div className="text-gray-500 text-xs">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user.clientNumber}</td>
                                            <td className="px-6 py-4">
                                                {user.kyc?.status === 'verified' && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Vérifié</span>}
                                                {user.kyc?.status === 'pending' && <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">En attente</span>}
                                                {user.kyc?.status === 'rejected' && <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Rejeté</span>}
                                                {(!user.kyc?.status || user.kyc?.status === 'not_started') && <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Non démarré</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.kyc?.status === 'verified' ? (
                                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Actif</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Inactif</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/admin/utilisateurs/${user._id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-gray-50 text-navy font-medium text-xs transition-colors border border-border"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Dossier
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
