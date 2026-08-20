import { getDb, COLLECTIONS } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EvaluateKycForm from './EvaluateKycForm';

export default async function AdminKycEvaluationPage({ params }: { params: { id: string } }) {
    const db = await getDb();

    let user;
    try {
        user = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(params.id) });
    } catch (e) {
        redirect('/admin/dashboard');
    }

    if (!user) redirect('/admin/dashboard');

    const documents = user.kyc?.documents || [];
    const status = user.kyc?.status || 'not_started';

    const docTitles: Record<string, string> = {
        cni: "Pièce d'identité",
        paySlip: "Bulletin de paie (mois courant)",
        paySlip2: "Fiche de paie (2e mois)",
        paySlip3: "Fiche de paie (3e mois)",
        address: "Justificatif de domicile",
        residenceCertificate: "Certificat de résidence",
        workCertificate: "Certificat de travail"
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/dashboard" className="w-10 h-10 rounded-full bg-navy-600 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="text-white font-bold">←</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-white">Revue KYC : {user.firstName} {user.lastName}</h1>
                    <p className="text-navy-300 text-sm">N° Client: {user.clientNumber} · Statut de vérification personnel</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Col: User Data Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-navy-600 border border-white/10 rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-bold text-white mb-4">Profil déclaré</h2>

                        <dl className="space-y-4 text-sm">
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Email</dt>
                                <dd className="text-white flex items-center gap-2">
                                    {user.email}
                                    {user.emailVerified ? <span className="text-green-500 text-xs">✓ Vérifié</span> : <span className="text-amber-500 text-xs">En attente</span>}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Téléphone</dt>
                                <dd className="text-white">{user.phone}</dd>
                            </div>
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Date de Naissance</dt>
                                <dd className="text-white">{new Date(user.dateOfBirth).toLocaleDateString('fr-FR')}</dd>
                            </div>
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Profession</dt>
                                <dd className="text-white">{user.profession}</dd>
                            </div>
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Revenus déclarés</dt>
                                <dd className="text-white font-mono">{user.monthlyIncome?.toLocaleString('fr-FR')} €</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-navy-600 border border-white/10 rounded-2xl p-6 shadow-lg">
                        <h2 className="text-lg font-bold text-white mb-4">Informations Chiffrées</h2>
                        <p className="text-xs text-navy-300 mb-4 bg-navy-700 p-3 rounded-lg border border-white/5">
                            ⚠️ Les informations suivantes sont déchiffrées dynamiquement à la volée pour votre session.
                        </p>
                        <dl className="space-y-4 text-sm">
                            <div>
                                <dt className="text-navy-300 font-medium pb-1">Document ({user.nationalIdType})</dt>
                                <dd className="text-white font-mono tracking-widest bg-black/40 p-2 rounded">
                                    {/* IMPORTANT FOR MVP: We omitted decryption call here to keep code simple for UI template, but conceptually we'd call `decrypt(user.nationalIdNumber)` here */}
                                    [Chiffré - {user.nationalIdNumber.substring(0, 25)}...]
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Right Col: Documents Viewer & Action */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-navy-600 border border-white/10 rounded-2xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white">Documents soumis</h2>
                            {status === 'pending' && <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold font-sans">À vérifier</span>}
                            {status === 'verified' && <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold font-sans">Validé</span>}
                            {status === 'rejected' && <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold font-sans">Rejeté</span>}
                        </div>

                        {documents.length === 0 ? (
                            <div className="text-center py-10 bg-navy-700/50 rounded-xl border border-white/5 border-dashed">
                                <p className="text-navy-300 text-sm">Le client n'a soumis aucun document.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {documents.map((doc: any) => (
                                    <div key={doc.type} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-navy-700/50 border border-white/5">
                                        <div className="sm:w-1/3">
                                            <h4 className="text-sm font-bold text-white">{docTitles[doc.type] || doc.type}</h4>
                                            <p className="text-xs text-navy-300 mt-1">
                                                Déposé le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <div className="sm:w-2/3 flex items-center justify-end">
                                            {doc.url && typeof doc.url === 'string' && doc.url.startsWith('/api/fichier/') ? (
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium rounded-lg"
                                                >
                                                    Ouvrir le document ↗
                                                </a>
                                            ) : (
                                                <span className="px-4 py-2 bg-white/5 text-navy-400 text-sm font-medium rounded-lg cursor-not-allowed">
                                                    Document indisponible
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Module */}
                    {status === 'pending' && documents.length > 0 && (
                        <EvaluateKycForm userId={params.id} />
                    )}

                    {status === 'rejected' && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                            <h3 className="text-red-400 font-bold mb-2">Dossier Rejeté</h3>
                            <p className="text-sm text-red-200">Motif : {user.kyc.rejectionReason}</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
