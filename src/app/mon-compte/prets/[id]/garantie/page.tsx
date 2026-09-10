import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CONTRACT_STUDY_FEE_CENTS } from '@/lib/loan-contract';
import { formatIbanForDisplay } from '@/lib/bank-validation';
import GuaranteeProofForm from './GuaranteeProofForm';

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

    if (!application || !['approved_pending_guarantee', 'contract_signed', 'guarantee_paid'].includes(application.status)) {
        redirect('/mon-compte/prets');
    }

    const guaranteeAmount = application.guaranteeDeposit?.required || Math.round((application.amount || 0) * 0.10);
    const studyFee = CONTRACT_STUDY_FEE_CENTS;
    const deadline = application.guaranteeDeposit?.deadline;
    const deadlineDate = deadline ? new Date(deadline) : null;
    const isExpired = deadlineDate && new Date() > deadlineDate;

    const timeLeft = deadlineDate ? deadlineDate.getTime() - Date.now() : 0;
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

    // Bank info depuis settings ou snapshot du dossier
    const bankSnapshot = application.guaranteeDeposit?.bankSnapshot as any;
    let bank: any = bankSnapshot || null;
    if (!bank) {
        const settings = await db.collection(COLLECTIONS.SETTINGS).find({ key: { $in: ['guarantee_bank_holder', 'guarantee_bank_iban', 'guarantee_bank_bic', 'guarantee_bank_name', 'guarantee_bank_instructions'] } }).toArray();
        const map: Record<string, string> = {};
        settings.forEach((s: any) => (map[s.key] = String(s.value || '')));
        if (map['guarantee_bank_holder'] && map['guarantee_bank_iban']) {
            bank = {
                holder: map['guarantee_bank_holder'],
                iban: map['guarantee_bank_iban'],
                ibanFormatted: formatIbanForDisplay(map['guarantee_bank_iban']),
                bic: map['guarantee_bank_bic'] || null,
                name: map['guarantee_bank_name'] || null,
                instructions: map['guarantee_bank_instructions'] || null,
            };
        }
    }

    const proofStatus = application.guaranteeDeposit?.status; // pending|submitted|paid|rejected
    const isPaid = proofStatus === 'paid' || application.status === 'guarantee_paid';

    if (isPaid) {
        return (
            <div className="max-w-lg mx-auto space-y-6 animate-fade-in py-8">
                <div className="card shadow-sm p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                    <h1 className="text-2xl font-extrabold text-navy mb-2">Garantie validée</h1>
                    <p className="text-gray-500 text-sm mb-4">Dossier {application.applicationNumber} · {application.productName}</p>
                    <p className="text-sm text-gray-600">Votre versement a été validé. Votre prêt est prêt à être débloqué par notre équipe.</p>
                    <Link href="/mon-compte/prets" className="btn-primary mt-6 inline-block">Retour à mes crédits</Link>
                </div>
            </div>
        );
    }

    const notInvited = application.status === 'contract_signed' && !application.guaranteeDeposit?.invitedAt;

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in py-8">
            <div className="card shadow-sm p-6">
                <h1 className="text-2xl font-extrabold text-navy mb-2 text-center">Versement de la Garantie</h1>
                <p className="text-gray-500 text-sm mb-4 text-center">
                    Dossier {application.applicationNumber} · {application.productName}
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-center">
                    <p className="text-sm text-amber-800 font-bold">Montant de la garantie</p>
                    <p className="text-3xl font-extrabold text-navy font-mono">
                        {(guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                    <p className="text-sm text-amber-700">+ Frais d'étude {(studyFee / 100).toLocaleString('fr-FR')} €</p>
                    {deadlineDate && !isExpired && (
                        <p className="text-sm text-amber-700 mt-2">
                            À verser sous {hoursLeft}h {minutesLeft}min
                        </p>
                    )}
                </div>

                {isExpired ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-center">
                        <p className="text-red-800 font-bold">Délai expiré</p>
                        <p className="text-sm text-red-700">Le délai de 14 jours pour verser la garantie est dépassé. Votre dossier a été automatiquement annulé.</p>
                    </div>
                ) : notInvited ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                        <p className="text-blue-800 font-bold">En attente de l’invitation</p>
                        <p className="text-sm text-blue-700 mt-1">Votre contrat signé a bien été reçu. Notre équipe va vous envoyer par email les coordonnées bancaires pour le versement (garantie + frais).</p>
                    </div>
                ) : (
                    <GuaranteeProofForm
                        applicationId={params.id}
                        guaranteeAmount={guaranteeAmount}
                        studyFee={studyFee}
                        bank={bank}
                        existingProof={application.guaranteeDeposit ? { status: String(application.guaranteeDeposit.status), proofUrl: application.guaranteeDeposit.proofUrl, submittedAt: application.guaranteeDeposit.submittedAt, rejectionReason: application.guaranteeDeposit.rejectionReason } : null}
                        applicationNumber={application.applicationNumber}
                    />
                )}
            </div>
        </div>
    );
}
