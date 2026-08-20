'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function SignedContractUploadForm({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setError(null);
        if (f && !f.name.toLowerCase().endsWith('.pdf')) {
            setError('Le fichier doit être au format PDF.');
            setFile(null);
            return;
        }
        setFile(f);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Veuillez sélectionner votre contrat signé (PDF).');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('applicationId', applicationId);
            formData.append('signedContract', file);

            const res = await fetch('/api/loans/contract/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Erreur lors de l'envoi du contrat");
            }

            setSuccess(true);
            setTimeout(() => router.refresh(), 900);
        } catch (err: any) {
            setError(err.message);
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Contrat signé déposé avec succès ! Notre équipe va procéder au déblocage de vos fonds.</span>
                </div>
            )}

            <label
                htmlFor="signedContract"
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
                    file ? 'border-green-400 bg-green-50/50' : 'border-primary-300 bg-primary-50/40 hover:bg-primary-50'
                }`}
            >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    {file ? <FileText className="w-6 h-6 text-green-600" /> : <Upload className="w-6 h-6 text-primary-500" />}
                </div>
                <div className="text-center">
                    <p className="font-bold text-navy text-sm">{file ? file.name : 'Cliquez pour choisir votre contrat signé (PDF)'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {file ? `${(file.size / 1024).toFixed(0)} Ko` : 'Téléversez le contrat signé en format PDF'}
                    </p>
                </div>
                <input
                    id="signedContract"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </label>

            <button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Envoi en cours...
                    </>
                ) : (
                    <>
                        <Upload className="w-5 h-5" />
                        Soumettre le contrat signé
                    </>
                )}
            </button>
        </div>
    );
}