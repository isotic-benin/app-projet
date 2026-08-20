import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
    submitted: { label: 'Soumise', color: 'bg-blue-100 text-blue-700' },
    under_review: { label: 'En analyse', color: 'bg-purple-100 text-purple-700' },
    decision_pending: { label: 'Décision en attente', color: 'bg-amber-100 text-amber-700' },
    approved_pending_guarantee: { label: 'Approuvé - Contrat à signer', color: 'bg-green-100 text-green-700' },
    guarantee_paid: { label: 'Garantie versée - Déblocage imminent', color: 'bg-emerald-100 text-emerald-700' },
    contract_signed: { label: 'Contrat signé - Garantie à verser', color: 'bg-amber-100 text-amber-700' },
    disbursed: { label: 'Débloqué', color: 'bg-primary-100 text-primary-700' },
    active: { label: 'En cours de remboursement', color: 'bg-primary-50 text-primary-600' },
    completed: { label: 'Soldé', color: 'bg-green-50 text-green-600' },
    rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
    expired: { label: 'Expiré', color: 'bg-gray-200 text-gray-500' },
};

export default async function MesPrets() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/connexion');

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    const applications = await db
        .collection(COLLECTIONS.LOAN_APPLICATIONS)
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

    const activeStatuses = ['disbursed', 'active'];
    const activeLoanIds = applications
        .filter(a => activeStatuses.includes(a.status))
        .map(a => a._id);

    const schedules = activeLoanIds.length > 0
        ? await db.collection('repaymentSchedules')
            .find({ loanApplicationId: { $in: activeLoanIds } })
            .toArray()
        : [];

    const scheduleMap = new Map(
        schedules.map(s => [s.loanApplicationId.toString(), s])
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Mes Crédits</h1>
                    <p className="text-gray-500 mt-1">Suivez l'état de vos demandes et crédits actifs.</p>
                </div>
                <Link href="/mon-compte/prets/demande" className="btn-primary text-sm py-3 px-6">
                    + Nouvelle demande
                </Link>
            </div>

            {applications.length === 0 ? (
                <div className="card shadow-sm text-center py-16">
                    <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-navy mb-2">Aucune demande pour le moment</h2>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Commencez par simuler votre crédit et soumettez votre première demande en ligne.
                    </p>
                    <Link href="/mon-compte/prets/demande" className="btn-primary">
                        Faire une demande
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((app) => {
                        const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: 'bg-gray-100 text-gray-600' };
                        const amountDisplay = ((app.amount || 0) / 100).toLocaleString('fr-FR');
                        const isActive = activeStatuses.includes(app.status);
                        const schedule = isActive ? scheduleMap.get(app._id.toString()) : null;

                        const paidCount = schedule?.installments?.filter((i: any) => i.status === 'paid').length || 0;
                        const totalCount = schedule?.installments?.length || 0;
                        const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
                        const rawNext = schedule?.installments?.find((i: any) => i.status === 'pending') || null;
                        const nextInstallment = rawNext ? {
                            number: rawNext.number,
                            totalDue: rawNext.totalDue,
                            dueDate: typeof rawNext.dueDate === 'string' ? rawNext.dueDate : rawNext.dueDate?.toISOString?.() || String(rawNext.dueDate),
                        } : null;

                        return (
                            <div key={app._id.toString()} className="card shadow-sm hover:shadow-card transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-gray-400">{app.applicationNumber}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-navy text-lg">{app.productName}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {amountDisplay} € · {app.duration} mois · {app.annualRate}% / an
                                        </p>

                                        {isActive && schedule && (
                                            <div className="mt-4 space-y-3 max-w-lg">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Remboursement</span>
                                                        <span className="font-bold text-primary-500">{progressPercent}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">{paidCount}/{totalCount} échéances réglées</p>
                                                </div>

                                                {nextInstallment && (
                                                    <div className="flex items-center gap-3 text-sm bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100/50 flex-wrap">
                                                        <span className="text-amber-700 font-medium">Prochaine échéance :</span>
                                                        <span className="font-bold text-navy font-mono">
                                                            {(nextInstallment.totalDue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                                        </span>
                                                        <span className="text-gray-400">le {new Date(nextInstallment.dueDate).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                )}

                                                {paidCount === totalCount && totalCount > 0 && (
                                                    <div className="text-sm text-green-600 font-bold bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                                                        Crédit intégralement remboursé
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-between gap-2 shrink-0">
                                        <p className="text-xs text-gray-400">
                                            {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                                        </p>
                                        <div className="flex gap-2">
                                            {isActive && (
                                                <Link
                                                    href={`/mon-compte/prets/${app._id}/echeancier`}
                                                    className="btn-secondary text-xs py-2 px-3 inline-block"
                                                >
                                                    Échéancier
                                                </Link>
                                            )}
                                            {app.status === 'approved_pending_guarantee' && (
                                                <Link
                                                    href={`/mon-compte/prets/${app._id}/contrat`}
                                                    className="btn-primary text-sm py-2 inline-block"
                                                >
                                                    Signer le contrat →
                                                </Link>
                                            )}
                                            {app.status === 'contract_signed' && (
                                                <>
                                                    <Link
                                                        href={`/mon-compte/prets/${app._id}/contrat`}
                                                        className="btn-secondary text-sm py-2 inline-block"
                                                    >
                                                        Voir le contrat
                                                    </Link>
                                                    <Link
                                                        href={`/mon-compte/prets/${app._id}/garantie`}
                                                        className="btn-primary text-sm py-2 inline-block"
                                                    >
                                                        Verser la garantie →
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
