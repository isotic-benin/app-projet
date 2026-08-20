import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, ShieldCheck, Clock, UserCheck, Wallet } from 'lucide-react';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/connexion');

    const db = await getDb();
    const userId = new ObjectId(session.user.id);
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
    if (!user) redirect('/connexion');

    const kycStatus = user.kyc?.status || 'not_started';
    const documentsSent = user.kyc?.documents?.length || 0;

    const recentTx = await db.collection(COLLECTIONS.TRANSACTIONS)
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

    const TX_LABELS: Record<string, { label: string; color: string }> = {
        disbursement: { label: 'Déblocage prêt', color: 'text-green-600' },
        guarantee_deposit: { label: 'Garantie', color: 'text-amber-600' },
        withdrawal: { label: 'Retrait', color: 'text-red-600' },
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Bonjour, {user.firstName}</h1>
                    <p className="text-gray-500 mt-1">Bienvenue dans votre espace personnel Altia Finance.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* WIDGET STATUT COMPTE */}
                <div className="card w-full shadow-sm hover:shadow-card transition-shadow bg-gradient-to-br from-primary-500 to-primary-700 text-white border-none">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider">Statut du compte</h2>
                        <UserCheck className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="text-2xl font-extrabold mb-1">
                        {kycStatus === 'verified' ? 'Compte actif' : 'En attente de vérification'}
                    </div>
                    <p className="text-primary-200 text-xs font-mono mb-4">N° {user.clientNumber || '—'}</p>
                    {kycStatus === 'verified' ? (
                        <p className="text-sm text-primary-100">Votre compte est activé. Vous pouvez demander un crédit.</p>
                    ) : (
                        <p className="text-sm text-primary-100">Complétez vos documents pour activer votre compte et accéder aux crédits.</p>
                    )}
                </div>

                {/* WIDGET PORTEFEUILLE */}
                <div className="card w-full shadow-sm transition-shadow bg-gradient-to-br from-navy to-primary-700 text-white border-none">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider">Mon portefeuille</h2>
                        <Wallet className="w-5 h-5 text-white/60" />
                    </div>
                    <p className="text-3xl font-extrabold font-mono mb-1">
                        {((user.accountBalance || 0) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                    <p className="text-primary-200 text-xs mb-4">Solde disponible</p>
                    <Link href="/mon-compte/retrait" className="btn-white w-full text-center text-sm py-3">
                        Retirer de l'argent
                    </Link>
                </div>

                {/* WIDGET KYC */}
                <div className="card w-full shadow-sm hover:shadow-card transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-navy">Identité & Documents</h2>
                        {kycStatus === 'verified' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Vérifié</span>}
                        {kycStatus === 'pending' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">En cours</span>}
                        {kycStatus === 'rejected' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Rejeté</span>}
                        {kycStatus === 'not_started' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">À compléter</span>}
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        {kycStatus === 'verified' ? "Vos documents ont été validés par notre équipe." :
                            kycStatus === 'pending' ? "Vos documents sont en cours d'analyse par l'équipe conformité." :
                                "Nous avons besoin de vérifier votre identité pour activer votre compte et débloquer l'accès aux prêts."}
                    </p>

                    {(kycStatus === 'not_started' || kycStatus === 'rejected') && (
                        <Link href="/mon-compte/kyc" className="btn-primary w-full text-center text-sm py-3">
                            Fournir mes documents {'->'}
                        </Link>
                    )}
                    {kycStatus === 'pending' && (
                        <div className="text-sm text-center text-gray-400 font-medium py-2">
                            {documentsSent} document(s) envoyé(s)
                        </div>
                    )}
                </div>

                {/* WIDGET PROCHAINE ÉTAPE */}
                <div className="card w-full shadow-sm transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-navy">Prochaine étape</h2>
                    </div>
                    {kycStatus === 'verified' ? (
                        <>
                            <p className="text-sm text-gray-500 mb-4">
                                Votre identité est vérifiée. Vous pouvez maintenant soumettre votre demande de crédit en ligne, gratuitement.
                            </p>
                            <Link href="/mon-compte/prets/demande" className="btn-primary w-full text-center text-sm py-3">
                                Faire une demande de crédit {'->'}
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-4">
                                {kycStatus === 'pending'
                                    ? 'Vos documents sont en cours de vérification par notre équipe conformité.'
                                    : 'Fournissez vos pièces justificatives pour activer votre compte.'}
                            </p>
                            <Link href="/mon-compte/kyc" className="btn-secondary w-full text-center text-sm py-3">
                                Compléter mes documents
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* TRANSACTIONS RÉCENTES */}
            {recentTx.length > 0 && (
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-navy">Dernières opérations</h2>
                        </div>
                    </div>
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
                                {recentTx.map((tx: any) => {
                                    const tInfo = TX_LABELS[tx.type] || { label: tx.type, color: 'text-gray-600' };
                                    const amount = tx.amount || 0;
                                    const isCredit = tx.type === 'disbursement';
                                    return (
                                        <tr key={tx._id.toString()} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className={`px-6 py-4 font-medium ${tInfo.color}`}>{tInfo.label}</td>
                                            <td className={`px-6 py-4 text-right font-mono font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                                {isCredit ? '+' : '-'}{(amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
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
                </div>
            )}

            {/* WIDGET CREDITS */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="card w-full shadow-sm">
                    <h2 className="font-bold text-navy mb-4">Mes Crédits Actifs</h2>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Briefcase className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 font-medium">Vous n'avez aucun crédit en cours pour le moment.</p>
                    </div>
                    {kycStatus === 'verified' && (
                        <Link href="/mon-compte/prets/demande" className="btn-secondary w-full text-center text-sm py-3 mt-4">
                            Simuler un nouveau crédit
                        </Link>
                    )}
                </div>
            </div>

            {/* SECURE BLOCK WARNING */}
            {kycStatus !== 'verified' && (
                <div className="bg-blue-50 border border-primary-200 rounded-xl p-5 flex gap-4 items-start">
                    <ShieldCheck className="w-7 h-7 text-primary-500 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-bold text-navy mb-1">Sécurité de vos données</h3>
                        <p className="text-sm text-blue-800">
                            Conformément à la réglementation bancaire, vos documents d'identité sont stockés de manière ultra-sécurisée et chiffrée. Ils ne serviront qu'à la stricte validation de votre dossier au sein de Altia Finance.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
