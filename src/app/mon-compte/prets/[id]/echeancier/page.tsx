import { getDb, COLLECTIONS } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';

export default async function ClientRepaymentSchedulePage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'client') redirect('/connexion');

    const db = await getDb();
    const userId = new ObjectId(session.user.id);
    const appId = new ObjectId(params.id);

    const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId, userId });
    if (!application) redirect('/mon-compte/prets');

    // Verify it has been disbursed
    if (application.status !== 'disbursed' && application.status !== 'active' && application.status !== 'completed') {
        return (
            <div className="w-full py-10 text-center animate-fade-in">
                <h1 className="text-2xl font-bold text-navy mb-4">Tableau d'amortissement non disponible</h1>
                <p className="text-gray-500 mb-6">Le échéancier sera généré une fois les fonds décaissés de notre côté.</p>
                <Link href="/mon-compte/prets" className="btn-secondary">Retour à mes crédits</Link>
            </div>
        );
    }

    const schedule = await db.collection('repaymentSchedules').findOne({ loanApplicationId: appId });

    if (!schedule) {
        return (
            <div className="w-full py-10 text-center animate-fade-in">
                <h1 className="text-2xl font-bold text-navy mb-4">Échéancier en préparation</h1>
                <p className="text-gray-500 mb-6">Le tableau d'amortissement est en cours de génération. Revenez dans quelques instants ou contactez notre équipe si le problème persiste.</p>
                <Link href="/mon-compte/prets" className="btn-secondary">Retour à mes crédits</Link>
            </div>
        );
    }

    const paidCount = schedule.installments.filter((i: any) => i.status === 'paid').length;
    const totalCount = schedule.installments.length;
    const progressPercent = Math.round((paidCount / totalCount) * 100);

    // Next pending installment
    const nextInstallment = schedule.installments.find((i: any) => i.status === 'pending');

    return (
        <div className="w-full space-y-6 animate-fade-in">
            <Link href="/mon-compte/prets" className="text-sm text-gray-500 font-semibold mb-2 inline-block hover:text-primary-500">
                ← Retour à mes crédits
            </Link>

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Échéancier de remboursement</h1>
                    <p className="text-gray-500 mt-2">Dossier N° {application.applicationNumber} · {application.productName}</p>
                </div>

                {nextInstallment ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 md:min-w-[300px]">
                        <p className="text-amber-800 text-sm font-bold mb-1">Prochaine échéance</p>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-bold text-navy font-mono">{(nextInstallment.totalDue / 100).toLocaleString('fr-FR')} <span className="text-sm">€</span></p>
                                <p className="text-xs text-amber-700 font-medium">Pour le {new Date(nextInstallment.dueDate).toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 border-t border-amber-200 pt-2">
                            Le règlement de vos échéances s'effectue auprès de notre équipe (virement ou Mobile Money). Consultez votre contrat pour les modalités.
                        </p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 md:min-w-[300px] text-center">
                        <PartyPopper className="w-7 h-7 text-green-500 mx-auto mb-2" />
                        <p className="text-green-800 font-bold">Crédit intégralement soldé !</p>
                    </div>
                )}
            </div>

            <div className="card shadow-sm p-6 mb-8">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-navy">Progression du remboursement</h3>
                    <span className="font-bold text-primary-500">{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div className="bg-primary-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 text-right">{paidCount} mensualité(s) réglée(s) sur {totalCount}</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-border rounded-xl bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-surface sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-navy">N°</th>
                            <th className="px-6 py-4 text-left font-semibold text-navy">Date d'exigibilité</th>
                            <th className="px-6 py-4 text-right font-semibold text-navy">Mensualité</th>
                            <th className="px-6 py-4 text-right font-semibold text-navy">Dont Capital</th>
                            <th className="px-6 py-4 text-right font-semibold text-navy">Dont Intérêts</th>
                            <th className="px-6 py-4 text-center font-semibold text-navy">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {schedule.installments.map((row: any) => (
                            <tr key={row.number} className={`transition-colors ${row.status === 'paid' ? 'bg-green-50/30' : 'hover:bg-primary-50/50'}`}>
                                <td className="px-6 py-3 text-navy font-bold">{row.number}</td>
                                <td className="px-6 py-3 text-gray-500">{new Date(row.dueDate).toLocaleDateString('fr-FR')}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-navy">{(row.totalDue / 100).toLocaleString('fr-FR')}</td>
                                <td className="px-6 py-3 text-right font-mono text-green-600">{(row.principalDue / 100).toLocaleString('fr-FR')}</td>
                                <td className="px-6 py-3 text-right font-mono text-amber-600">{(row.interestDue / 100).toLocaleString('fr-FR')}</td>
                                <td className="px-6 py-3 text-center">
                                    {row.status === 'paid' ? (
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Réglé ✓</span>
                                    ) : row.status === 'late' ? (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">En retard</span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium">À venir</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
