'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle, AlertTriangle, Building2, FileText, Download, Clock } from 'lucide-react';

interface Props {
    applicationId: string;
    guaranteeAmount: number;
    studyFee: number;
    bank: {
        holder: string;
        iban: string;
        ibanFormatted: string;
        bic?: string | null;
        name?: string | null;
        instructions?: string | null;
    } | null;
    existingProof?: { status: string; proofUrl?: string; submittedAt?: string | null; rejectionReason?: string | null } | null;
    applicationNumber: string;
}

export default function GuaranteeProofForm({ applicationId, guaranteeAmount, studyFee, bank, existingProof, applicationNumber }: Props) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const guaranteeDisplay = (guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const studyDisplay = (studyFee / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const total = ((guaranteeAmount + studyFee) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setError(null);
        if (f && f.size > 8 * 1024 * 1024) { setError('Fichier trop volumineux (max 8 Mo).'); return; }
        const ext = f ? (f.name.split('.').pop() || '').toLowerCase() : '';
        if (f && !['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) { setError('Format non autorisé. PDF, JPG, PNG ou WEBP.'); return; }
        setFile(f);
    };

    const handleUpload = async () => {
        if (!file) { setError('Veuillez joindre votre preuve de virement.'); return; }
        setIsUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('applicationId', applicationId);
            fd.append('proof', file);
            const res = await fetch('/api/loans/guarantee/proof', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors du dépôt');
            setSuccess(true);
            setTimeout(() => router.refresh(), 900);
        } catch (e: any) {
            setError(e.message);
            setIsUploading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Preuve déposée !</h3>
                <p className="text-gray-500">Notre équipe va la vérifier sous 24h ouvrées. Vous serez notifié.</p>
            </div>
        );
    }

    if (existingProof?.status === 'submitted') {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-amber-800">Preuve en attente de validation</h3>
                <p className="text-sm text-amber-700 mt-1">Déposée {existingProof.submittedAt ? `le ${new Date(existingProof.submittedAt).toLocaleString('fr-FR')}` : ''} — notre équipe la contrôle sous 24h.</p>
                {existingProof.proofUrl && (
                    <a href={existingProof.proofUrl} target="_blank" className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-amber-800 hover:underline">
                        <FileText className="w-4 h-4" /> Voir ma preuve
                    </a>
                )}
                <p className="text-xs text-amber-600 mt-4">Vous pourrez déposer une nouvelle preuve si celle-ci est rejetée.</p>
            </div>
        );
    }

    if (existingProof?.status === 'rejected') {
        // Show rejection + allow re-upload below
    }

    return (
        <div className="space-y-5 text-left">
            {existingProof?.status === 'rejected' && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Votre précédente preuve a été rejetée : {existingProof.rejectionReason || 'preuve illisible'}. Veuillez déposer une nouvelle preuve lisible.</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" /><span className="font-medium">{error}</span>
                </div>
            )}

            {/* Rappel montants */}
            <div className="bg-surface rounded-xl p-4 border border-border">
                <p className="text-xs text-gray-500 font-medium">Total à verser</p>
                <p className="text-2xl font-extrabold text-navy font-mono">{total} €</p>
                <p className="text-xs text-gray-500 mt-1">Garantie {guaranteeDisplay} € + Frais d'étude {studyDisplay} €</p>
                <p className="text-xs text-gray-400 mt-1">Référence : <span className="font-mono bg-white border border-border rounded px-2 py-0.5">{applicationNumber}</span></p>
            </div>

            {/* RIB */}
            {bank ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-5 h-5 text-amber-700" />
                        <h3 className="font-bold text-amber-900 text-sm">Coordonnées bancaires — virement à effectuer</h3>
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <p><span className="text-gray-500">Titulaire :</span> <strong className="text-navy">{bank.holder}</strong></p>
                        <p><span className="text-gray-500">IBAN / RIB :</span> <span className="font-mono bg-white border border-amber-200 rounded px-2 py-1">{bank.ibanFormatted || bank.iban}</span></p>
                        {bank.bic && <p><span className="text-gray-500">BIC :</span> <span className="font-mono">{bank.bic}</span></p>}
                        {bank.name && <p><span className="text-gray-500">Banque :</span> {bank.name}</p>}
                        {bank.instructions && <p className="text-xs text-amber-800 bg-white border border-amber-100 rounded-lg p-3 mt-2">{bank.instructions}</p>}
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    Les coordonnées bancaires n'ont pas encore été configurées. Contactez notre équipe.
                </div>
            )}

            <div className="border-t border-border pt-4">
                <h3 className="font-bold text-navy mb-2 flex items-center gap-2"><Upload className="w-5 h-5 text-primary-500" /> Déposer votre preuve de virement</h3>
                <ol className="list-decimal list-inside text-sm text-gray-500 space-y-1 ml-1">
                    <li>Effectuez le virement de {total} € sur le compte ci-dessus (mentionnez votre n° dossier).</li>
                    <li>Conservez l’avis de virement / capture (PDF, JPG, PNG).</li>
                    <li>Déposez le justificatif ci-dessous.</li>
                </ol>
            </div>

            <label htmlFor="proof" className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${file ? 'border-green-400 bg-green-50/50' : 'border-primary-300 bg-primary-50/40 hover:bg-primary-50'}`}>
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    {file ? <FileText className="w-6 h-6 text-green-600" /> : <Upload className="w-6 h-6 text-primary-500" />}
                </div>
                <div className="text-center">
                    <p className="font-bold text-navy text-sm">{file ? file.name : 'Cliquez pour choisir votre preuve (PDF / image)'}</p>
                    <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(0)} Ko` : 'Max 8 Mo'}</p>
                </div>
                <input id="proof" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileChange} />
            </label>

            <button onClick={handleUpload} disabled={isUploading || !file} className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary-500/20">
                {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Dépôt en cours...</> : <><Upload className="w-5 h-5" /> Envoyer la preuve</>}
            </button>

            <p className="text-xs text-gray-400 text-center">Votre preuve sera vérifiée sous 24h ouvrées. Le déblocage interviendra après validation.</p>
        </div>
    );
}
