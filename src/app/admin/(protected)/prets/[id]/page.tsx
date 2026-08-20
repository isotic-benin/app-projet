import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminDecisionButtons from './AdminDecisionButtons';
import DisburseButton from './DisburseButton';
import InviteGuaranteeButton from './InviteGuaranteeButton';
import SendContractForm from './SendContractForm';
import { Banknote, Clock, AlertTriangle, Mail, FileSignature, FileText, Download, HandCoins, CheckCircle2 } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    submitted: { label: 'Soumise (sans garantie)', color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' },
    under_review: { label: 'En analyse (Garantie Payée)', color: 'bg-amber-50 text-amber-700 font-bold ring-1 ring-amber-600/20' },
    approved_pending_guarantee: { label: 'Approuvé - Garantie requise', color: 'bg-green-50 text-green-700 ring-1 ring-green-600/20' },
    guarantee_paid: { label: 'Garantie versée', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 font-bold' },
    contract_signed: { label: 'Contrat signé - Garantie à verser', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 font-bold' },
    disbursed: { label: 'Débloqué (Actif)', color: 'bg-primary-50 text-primary-700 ring-1 ring-primary-600/20 font-bold' },
    completed: { label: 'Soldé', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
    rejected: { label: 'Refusé', color: 'bg-red-50 text-red-700 ring-1 ring-red-600/20' },
    expired: { label: 'Expiré', color: 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20' },
};

export default async function AdminLoanDetails({ params }: { params: { id: string } }) {
    const db = await getDb();
    let application;

    try {
        application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).aggregate([
            { $match: { _id: new ObjectId(params.id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
        ]).next();
    } catch (e) {
        redirect('/admin/prets');
    }

    if (!application) redirect('/admin/prets');

    const u = application.user;
    const statusInfo = STATUS_LABELS[application.status] || { label: application.status, color: 'bg-gray-500 text-gray-200' };

    const displayAmount = (application.amount / 100).toLocaleString('fr-FR');
    const displayGuarantee = (application.guaranteeDeposit?.required / 100).toLocaleString('fr-FR');
    const guaranteePaid = application.guaranteeDeposit?.status === 'paid';
    const deadline = application.guaranteeDeposit?.deadline;
    const deadlineDate = deadline ? new Date(deadline) : null;
    const timeLeft = deadlineDate ? deadlineDate.getTime() - Date.now() : 0;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const isExpiringSoon = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/prets" className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors">
                        <span className="font-bold">←</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold text-navy">Dossier {application.applicationNumber}</h1>
                        <p className="text-gray-500 text-sm">Produit : {application.productName}</p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm ${statusInfo.color}`}>
                    {statusInfo.label}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                <div className="space-y-6">
                    <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-navy mb-4">Emprunteur</h2>
                        <div className="mb-4">
                            <p className="text-navy font-bold">{u.firstName} {u.lastName}</p>
                            <p className="text-gray-500 text-sm">{u.email}</p>
                            <div className="mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full font-bold ${u.kyc?.status === 'verified' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                                    KYC: {u.kyc?.status}
                                </span>
                            </div>
                        </div>
                        <div>
                            <dt className="text-gray-500 text-xs font-medium pb-1">Usage prévu</dt>
                            <dd className="text-navy text-sm bg-gray-50 p-3 rounded-lg border border-border italic break-words">
                                "{application.purpose}"
                            </dd>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-border shadow-sm rounded-2xl p-6 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-500 text-xs font-medium">Montant demandé</p>
                            <p className="text-2xl font-bold text-navy font-mono">{displayAmount} €</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-medium">Durée & Taux</p>
                            <p className="text-2xl font-bold text-navy">{application.duration} mois <span className="text-primary-500 text-sm">({application.annualRate}%)</span></p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-medium">Dépôt de Garantie (10%)</p>
                            <p className="text-lg font-bold font-mono">
                                <span className={guaranteePaid ? 'text-green-600' : 'text-amber-600'}>{displayGuarantee} €</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-md border align-text-top ml-1 ${guaranteePaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {guaranteePaid ? 'Payé' : 'Impayé'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-medium">Date de soumission</p>
                            <p className="text-sm font-medium text-navy">
                                {new Date(application.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    </div>

                    {deadlineDate && !guaranteePaid && (
                        <div className={`rounded-2xl p-5 border ${isExpiringSoon ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center gap-3">
                                <Clock className={`w-6 h-6 ${isExpiringSoon ? 'text-red-500' : 'text-amber-500'}`} />
                                <div>
                                    <p className={`font-bold text-sm ${isExpiringSoon ? 'text-red-800' : 'text-amber-800'}`}>
                                        Garantie à verser sous 14 jours
                                    </p>
                                    <p className={`text-sm ${isExpiringSoon ? 'text-red-700' : 'text-amber-700'}`}>
                                        Temps restant : {hoursLeft}h {minutesLeft}min
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {application.status === 'submitted' && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                            <h3 className="text-blue-800 font-bold mb-2">Dossier soumis sans garantie</h3>
                            <p className="text-sm text-blue-900/70 mb-6">Le client n'a pas encore versé le dépôt de garantie. Vous pouvez approuver le dossier (le client aura 14 jours pour verser la garantie de 10%) ou le refuser.</p>
                            <AdminDecisionButtons applicationId={application._id.toString()} />
                        </div>
                    )}

                    {application.status === 'under_review' && (
                        <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-6">
                            <h3 className="text-primary-800 font-bold mb-2">Décision et Déblocage</h3>
                            <p className="text-sm text-primary-900/70 mb-6">Le client a versé le dépôt de garantie requis. Vous pouvez dès à présent approuver le prêt (décaissement automatique) ou refuser.</p>
                            <AdminDecisionButtons applicationId={application._id.toString()} />
                        </div>
                    )}

                    {application.status === 'approved_pending_guarantee' && !guaranteePaid && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
                            <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                En attente de la signature du contrat
                            </h3>
                            <p className="text-sm text-amber-900/70">
                                Le contrat PDF a été envoyé au client. Il doit le télécharger, le signer et le déposer (PDF) dans son espace client. Une fois le contrat signé reçu, vous invitez le client à verser la garantie de {displayGuarantee} € avant le déblocage des fonds.
                            </p>
                        </div>
                    )}

                    {application.status === 'contract_signed' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                            <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2">
                                <HandCoins className="w-5 h-5" />
                                Contrat signé reçu — Garantie à verser
                            </h3>
                            <p className="text-sm text-amber-900/70 mb-4">
                                Le client a déposé son contrat signé. Invitez-le au dépôt de la garantie de {displayGuarantee} € (10% du montant, mentionnée dans le contrat) via une notification. Le déblocage des fonds ne sera possible qu'une fois la garantie versée.
                            </p>
                            {application.guaranteeDeposit?.invitedAt ? (
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 inline-flex">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Invitation envoyée le {new Date(application.guaranteeDeposit.invitedAt).toLocaleDateString('fr-FR')}
                                </div>
                            ) : (
                                <InviteGuaranteeButton applicationId={application._id.toString()} />
                            )}
                        </div>
                    )}

                    {application.status === 'guarantee_paid' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                            <h3 className="text-emerald-800 font-bold mb-3 flex items-center gap-2">
                                <Banknote className="w-5 h-5" />
                                Garantie versée — Prêt à débloquer
                            </h3>
                            <p className="text-sm text-emerald-900/70 mb-4">
                                Le client a versé la garantie de {displayGuarantee} €. Vous pouvez désormais débloquer les fonds : le montant du prêt sera crédité sur le portefeuille du client.
                            </p>
                            <DisburseButton applicationId={application._id.toString()} />
                        </div>
                    )}

                    {/* ─── Contrat PDF / Signature ─── */}
                    {application.contract && (
                        <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                    <FileSignature className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-navy">Contrat de prêt & signature</h2>
                                    <p className="text-sm text-gray-500">Contrat PDF envoyé au client et état de la signature.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {application.contract.pdfUrl ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-primary-500 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-navy">Contrat généré</p>
                                                <p className="text-xs text-gray-500">
                                                    {application.contract.sentAt ? `Envoyé le ${new Date(application.contract.sentAt).toLocaleDateString('fr-FR')}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <a href={application.contract.pdfUrl} target="_blank" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700">
                                            <Download className="w-4 h-4" /> Voir le PDF
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">Aucun contrat PDF généré pour ce dossier.</p>
                                )}

                                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-4 border ${application.contract.signed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <FileSignature className={`w-5 h-5 shrink-0 ${application.contract.signed ? 'text-emerald-600' : 'text-amber-500'}`} />
                                        <div>
                                            <p className="text-sm font-bold text-navy">
                                                {application.contract.signed ? 'Contrat signé reçu' : 'En attente de la signature du client'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {application.contract.signedAt
                                                    ? `Signé le ${new Date(application.contract.signedAt).toLocaleDateString('fr-FR')}`
                                                    : 'Le client doit télécharger, signer et renvoyer le contrat en PDF.'}
                                            </p>
                                        </div>
                                    </div>
                                    {application.contract.signedUrl && (
                                        <a href={application.contract.signedUrl} target="_blank" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">
                                            <Download className="w-4 h-4" /> Voir le contrat signé
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {['submitted', 'under_review', 'approved_pending_guarantee', 'guarantee_paid'].includes(application.status) && (
                        <SendContractForm applicationId={application._id.toString()} />
                    )}

                    {application.emailThread && application.emailThread.length > 0 && (
                        <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Mail className="w-5 h-5 text-primary-500" />
                                <h2 className="text-lg font-bold text-navy">Historique des emails envoyés</h2>
                            </div>
                            <ul className="space-y-4">
                                {application.emailThread.map((email: any, i: number) => (
                                    <li key={i} className="flex gap-4 items-start text-sm bg-surface rounded-xl p-4 border border-border">
                                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-navy">{email.subject}</p>
                                            <p className="text-xs text-gray-400">{new Date(email.sentAt).toLocaleString('fr-FR')} · {email.direction === 'outbound' ? 'Envoyé' : 'Reçu'}</p>
                                            {email.body && <p className="text-gray-600 italic mt-1 text-xs">« {email.body} »</p>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {application.status === 'disbursed' && (
                        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 flex justify-between items-center shadow-sm shadow-primary-500/5">
                            <div>
                                <h3 className="text-primary-800 font-bold">Fonds décaissés</h3>
                                <p className="text-sm text-primary-900/70">Ce client rembourse actuellement ce dossier.</p>
                            </div>
                            <Banknote className="w-8 h-8 text-primary-500" />
                        </div>
                    )}

                    {application.status === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-red-800 font-bold">Dossier Refusé</h3>
                            {guaranteePaid && (
                                <p className="text-sm text-red-900/70 mt-1">La somme correspondant à la garantie de 10% a été remboursée sur le compte du client.</p>
                            )}
                            {application.decisionNote && (
                                <p className="text-sm text-red-700 mt-2 italic">Motif : {application.decisionNote}</p>
                            )}
                        </div>
                    )}

                    <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-navy mb-4">Historique de la demande</h2>
                        <ul className="space-y-4">
                            {application.statusHistory?.map((hist: any, i: number) => (
                                <li key={i} className="flex gap-4 items-start text-sm">
                                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-navy capitalize">{hist.status.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-gray-400">{new Date(hist.changedAt).toLocaleString('fr-FR')}</p>
                                        {hist.note && <p className="text-gray-600 italic mt-1 text-xs bg-gray-50 p-2 rounded-md border border-border block w-full">« {hist.note} »</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}
