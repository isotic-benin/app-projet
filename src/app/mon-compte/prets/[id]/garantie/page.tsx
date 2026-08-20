import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import GuaranteePaymentForm from './GuaranteePaymentForm';

export default async function GarantiePage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/connexion');

    const db = await getDb();
    let appId: ObjectId;
    try {
        appId = new ObjectId(params.id);
    } catch {
        notFound();
    }

    const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({
        _id: appId,
        userId: new ObjectId(session.user.id),
    });

    if (!application || !['approved_pending_guarantee', 'contract_signed'].includes(application.status)) {
        redirect('/mon-compte/prets');
    }

    const guaranteeAmount = application.guaranteeDeposit?.required || 0;
    const deadline = application.guaranteeDeposit?.deadline;
    const deadlineDate = deadline ? new Date(deadline) : null;
    const isExpired = deadlineDate && new Date() > deadlineDate;

    const timeLeft = deadlineDate ? deadlineDate.getTime() - Date.now() : 0;
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in py-8">
            <div className="card shadow-sm p-6 text-center">
                <h1 className="text-2xl font-extrabold text-navy mb-2">Versement de la Garantie</h1>
                <p className="text-gray-500 text-sm mb-4">
                    Dossier {application.applicationNumber} · {application.productName}
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                    <p className="text-sm text-amber-800 font-bold">Montant de la garantie</p>
                    <p className="text-3xl font-extrabold text-navy font-mono">
                        {(guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                    {deadlineDate && !isExpired && (
                        <p className="text-sm text-amber-700 mt-2">
                            À verser sous {hoursLeft}h {minutesLeft}min
                        </p>
                    )}
                </div>

                {isExpired ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                        <p className="text-red-800 font-bold">Délai expiré</p>
                        <p className="text-sm text-red-700">Le délai de 14 jours pour verser la garantie est dépassé. Votre dossier a été automatiquement annulé.</p>
                    </div>
                ) : (
                    <GuaranteePaymentForm
                        applicationId={params.id}
                        guaranteeAmount={guaranteeAmount}
                    />
                )}
            </div>
        </div>
    );
}
