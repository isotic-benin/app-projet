import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Download, FileSignature, CheckCircle2, FileText, Mail } from 'lucide-react';
import SignedContractUploadForm from './SignedContractUploadForm';

export default async function ContratPage({ params }: { params: { id: string } }) {
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

    if (!application) {
        redirect('/mon-compte/prets');
    }

    const status = application.status;
    const contract = application.contract;
    const isSigned = contract?.signed === true;
    const canSign = ['approved_pending_guarantee', 'contract_signed'].includes(status);
    const hasPdf = !!contract?.pdfUrl;

    const displayAmount = ((application.amount || 0) / 100).toLocaleString('fr-FR');
    const guaranteeAmount = (application.guaranteeDeposit?.required || 0) / 100;
    const monthly = ((application.amount || 0) * (application.annualRate / 100 / 12)) / (1 - Math.pow(1 + application.annualRate / 100 / 12, -(application.duration || 1)));

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-6">
            <Link href="/mon-compte/prets" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 transition-colors">
                ← Retour à mes crédits
            </Link>

            <div className="card shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                        <FileSignature className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-navy">Signature du contrat</h1>
                        <p className="text-sm text-gray-500">
                            Dossier {application.applicationNumber} · {application.productName}
                        </p>
                    </div>
                </div>

                {!canSign ? (
                    <div className="bg-gray-50 border border-border rounded-2xl p-6 text-center">
                        <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                            La signature du contrat n'est pas nécessaire à ce stade du dossier.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Conditions récapitulatives */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-surface rounded-xl p-4 border border-border">
                                <p className="text-xs text-gray-500 font-medium">Montant du prêt</p>
                                <p className="text-xl font-extrabold text-navy font-mono">{displayAmount} €</p>
                            </div>
                            <div className="bg-surface rounded-xl p-4 border border-border">
                                <p className="text-xs text-gray-500 font-medium">Durée & Taux</p>
                                <p className="text-xl font-extrabold text-navy">
                                    {application.duration} mois <span className="text-sm text-primary-500">({application.annualRate}%)</span>
                                </p>
                            </div>
                            <div className="bg-surface rounded-xl p-4 border border-border">
                                <p className="text-xs text-gray-500 font-medium">Mensualité estimée</p>
                                <p className="text-xl font-extrabold text-navy font-mono">
                                    {monthly.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                                </p>
                            </div>
                            <div className="bg-surface rounded-xl p-4 border border-border">
                                <p className="text-xs text-gray-500 font-medium">Garantie (10%)</p>
                                <p className="text-xl font-extrabold text-navy font-mono">
                                    {guaranteeAmount.toLocaleString('fr-FR')} €
                                </p>
                            </div>
                        </div>

                        {hasPdf && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary-50/60 border border-primary-100 rounded-2xl p-5 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-navy text-sm">Votre contrat de crédit (PDF)</p>
                                        <p className="text-xs text-gray-500">
                                            {contract?.sentAt ? `Envoyé le ${new Date(contract.sentAt).toLocaleDateString('fr-FR')}` : 'Disponible au téléchargement'}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={contract.pdfUrl}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-primary-300 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-50 transition-colors shadow-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Télécharger
                                </a>
                            </div>
                        )}

                        {!isSigned ? (
                            <div>
                                <div className="mb-4">
                                    <h2 className="font-bold text-navy mb-2 flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-primary-500" />
                                        Déposer votre contrat signé
                                    </h2>
                                    <ol className="list-decimal list-inside text-sm text-gray-500 space-y-1 ml-1">
                                        <li>Téléchargez le contrat PDF ci-dessus</li>
                                        <li>Imprimez-le puis signez-le (mention « Lu et approuvé » + signature)</li>
                                        <li>Scannez ou photographiez la version signée et déposez-la ci-dessous (PDF)</li>
                                    </ol>
                                </div>
                                <SignedContractUploadForm applicationId={params.id} />
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-emerald-800">Contrat signé reçu</p>
                                        <p className="text-sm text-emerald-700">
                                            {contract?.signedAt ? `Déposé le ${new Date(contract.signedAt).toLocaleDateString('fr-FR')}` : ''} — En attente de validation par notre équipe.
                                        </p>
                                    </div>
                                </div>
                                {contract?.signedUrl && (
                                    <a
                                        href={contract.signedUrl}
                                        target="_blank"
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-emerald-300 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Voir mon contrat signé
                                    </a>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}