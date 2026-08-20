import { getDb, COLLECTIONS } from '@/lib/db';
import Link from 'next/link';

export default async function AdminDashboardPage() {
    const db = await getDb();

    const totalUsers = await db.collection(COLLECTIONS.USERS).countDocuments({ status: { $ne: 'pending_verification' } });
    const kycPendingCount = await db.collection(COLLECTIONS.USERS).countDocuments({ 'kyc.status': 'pending' });
    const pendingLoans = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).countDocuments({
        status: { $in: ['submitted', 'under_review', 'decision_pending'] }
    });

    const kycPendingUsers = await db.collection(COLLECTIONS.USERS)
        .find({ 'kyc.status': 'pending' })
        .sort({ 'kyc.documents.0.uploadedAt': 1 })
        .limit(5)
        .toArray();

    // ── Loan repayment overview ──
    const activeLoans = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).aggregate([
        { $match: { status: { $in: ['disbursed', 'active'] } } },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        { $unwind: '$user' },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
    ]).toArray();

    const activeLoanIds = activeLoans.map(a => a._id);
    const schedules = activeLoanIds.length > 0
        ? await db.collection('repaymentSchedules').find({
            loanApplicationId: { $in: activeLoanIds }
        }).toArray()
        : [];

    const scheduleMap = new Map(
        schedules.map(s => [s.loanApplicationId.toString(), s])
    );

    let totalExpected = 0;
    let totalRepaid = 0;
    const loansWithProgress = activeLoans.map(app => {
        const schedule = scheduleMap.get(app._id.toString());
        const installments = schedule?.installments || [];
        const paid = installments.filter((i: any) => i.status === 'paid');
        const totalDue = installments.reduce((s: number, i: any) => s + (i.totalDue || 0), 0);
        const totalPaid = paid.reduce((s: number, i: any) => s + (i.amountPaid || i.totalDue || 0), 0);
        const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
        const next = installments.find((i: any) => i.status === 'pending') || null;

        totalExpected += totalDue;
        totalRepaid += totalPaid;

        return {
            id: app._id.toString(),
            appNum: app.applicationNumber,
            productName: app.productName,
            amount: app.amount,
            user: app.user,
            scheduleExists: !!schedule,
            paidCount: paid.length,
            totalCount: installments.length,
            totalDue,
            totalPaid,
            progressPct: pct,
            nextInstallment: next ? {
                number: next.number,
                totalDue: next.totalDue,
                dueDate: typeof next.dueDate === 'string' ? next.dueDate : next.dueDate?.toISOString?.() || String(next.dueDate),
            } : null,
        };
    });

    const totalRemaining = totalExpected - totalRepaid;
    const overallPct = totalExpected > 0 ? Math.round((totalRepaid / totalExpected) * 100) : 0;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-extrabold text-navy">Tableau de bord</h1>
                <p className="text-gray-500 mt-1">Vue d'ensemble de l'activité de la plateforme.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                    <div className="text-gray-500 text-sm font-medium mb-2">Comptes Clients Actifs</div>
                    <div className="text-3xl font-bold text-navy">{totalUsers}</div>
                </div>

                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-primary-500/50 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="text-gray-500 text-sm font-medium mb-2 relative z-10">Dossiers KYC en attente</div>
                    <div className="flex items-baseline gap-3 relative z-10">
                        <span className="text-3xl font-bold text-navy">{kycPendingCount}</span>
                        {kycPendingCount > 0 && <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200">À traiter</span>}
                    </div>
                </div>

                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-primary-500/50 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="text-gray-500 text-sm font-medium mb-2 relative z-10">Demandes de prêt à évaluer</div>
                    <div className="flex items-baseline gap-3 relative z-10">
                        <span className="text-3xl font-bold text-navy">{pendingLoans}</span>
                        {pendingLoans > 0 && <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200">En attente</span>}
                    </div>
                </div>

                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-primary-500/50 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="text-gray-500 text-sm font-medium mb-2 relative z-10">Prêts décaissés</div>
                    <div className="flex items-baseline gap-3 relative z-10">
                        <span className="text-3xl font-bold text-navy">{activeLoans.length}</span>
                        {activeLoans.length > 0 && <span className="text-xs font-bold px-2 py-1 bg-primary-50 text-primary-600 rounded-full border border-primary-200">En cours</span>}
                    </div>
                </div>
            </div>

            {/* KYC table */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-navy">KYC à vérifier en priorité</h2>
                    <Link href="/admin/kyc-attente" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                        Tout voir →
                    </Link>
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
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Aucun dossier KYC en attente de vérification.
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
                                                Vérifier le dossier
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Loan Repayment Overview ── */}
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-navy">Remboursements des prêts en cours</h2>
                    <Link href="/admin/prets" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                        Tout voir →
                    </Link>
                </div>

                {loansWithProgress.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-primary-50/30 border-b border-border">
                        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
                            <p className="text-xs text-gray-500 font-medium">Total prêté</p>
                            <p className="text-2xl font-bold text-navy font-mono">
                                {(totalExpected / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
                            <p className="text-xs text-gray-500 font-medium">Total remboursé</p>
                            <p className="text-2xl font-bold text-green-600 font-mono">
                                {(totalRepaid / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
                            <p className="text-xs text-gray-500 font-medium">Reste à recouvrer</p>
                            <p className="text-2xl font-bold text-amber-600 font-mono">
                                {(totalRemaining / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                        </div>
                        <div className="sm:col-span-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Taux de remboursement global</span>
                                <span className="font-bold text-primary-500">{overallPct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${overallPct}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">N° Dossier</th>
                                <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                <th className="px-6 py-4 font-semibold">Progression</th>
                                <th className="px-6 py-4 font-semibold text-right">Remboursé</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loansWithProgress.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Aucun prêt actif pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                loansWithProgress.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-navy">{loan.user.firstName} {loan.user.lastName}</div>
                                            <div className="text-gray-500 text-xs">{loan.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{loan.appNum}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-navy">
                                            {(loan.amount / 100).toLocaleString('fr-FR')} €
                                        </td>
                                        <td className="px-6 py-4 min-w-[180px]">
                                            {loan.scheduleExists ? (
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">{loan.paidCount}/{loan.totalCount}</span>
                                                        <span className="font-bold text-primary-500">{loan.progressPct}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${loan.progressPct}%` }}></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">En attente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                                            {(loan.totalPaid / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/prets/${loan.id}`}
                                                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-gray-50 text-navy font-medium text-xs transition-colors border border-border"
                                            >
                                                Voir
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
