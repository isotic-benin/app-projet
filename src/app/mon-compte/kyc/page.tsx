'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Contact, FileText, Home, CheckCircle, BadgeCheck } from 'lucide-react';

interface KycFiles {
    cni: File | null;
    paySlip: File | null;
    address: File | null;
}

const EMPTY_FILES: KycFiles = {
    cni: null,
    paySlip: null,
    address: null,
};

export default function KycPage() {
    const router = useRouter();
    const [files, setFiles] = useState<KycFiles>(EMPTY_FILES);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof KycFiles) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Limit to 5MB
            if (file.size > 5 * 1024 * 1024) {
                setError("Le fichier ne doit pas dépasser 5 Mo.");
                return;
            }
            setFiles((prev) => ({ ...prev, [type]: file }));
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!files.cni || !files.paySlip || !files.address) {
            setError("Veuillez fournir tous les documents obligatoires (Pièce d'identité, Bulletin de salaire, Justificatif de domicile).");
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        (Object.keys(files) as (keyof KycFiles)[]).forEach((key) => {
            if (files[key]) formData.append(key, files[key] as File);
        });

        try {
            const res = await fetch('/api/kyc/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors de l\'envoi des documents');
            }

            router.push('/mon-compte');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsUploading(false);
        }
    };

    const uploadCard = (
        type: keyof KycFiles,
        title: string,
        desc: string,
        icon: React.ReactNode,
        required?: boolean,
        accept?: string
    ) => (
        <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface hover:border-primary-300 transition-colors">
            {icon}
            <div className="flex-1">
                <label className="font-bold text-navy block text-lg mb-1 cursor-pointer">
                    {title}
                    {required && <span className="text-red-500 text-sm"> *</span>}
                </label>
                <p className="text-xs text-gray-500 mb-3">{desc}</p>
                <input
                    type="file"
                    accept={accept || 'application/pdf,image/jpeg,image/png'}
                    onChange={(e) => handleFileChange(e, type)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
            </div>
            {files[type] && <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
        </div>
    );

    return (
        <div className="w-full animate-fade-in">
            <div className="mb-8">
                <Link href="/mon-compte" className="text-sm text-gray-500 font-semibold mb-2 inline-block hover:text-primary-500">
                    ← Retour au tableau de bord
                </Link>
                <h1 className="text-3xl font-extrabold text-navy">Vérification de votre profil (KYC)</h1>
                <p className="text-gray-500 mt-2">
                    Pour des raisons légales et de sécurité, nous devons collecter et vérifier certaines informations avant d'activer votre compte et de vous autoriser à demander un crédit.
                </p>
            </div>

            {error && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="card shadow-sm space-y-4 pt-6 pb-8">
                    <h3 className="text-sm font-bold text-navy uppercase tracking-wider px-4">Documents obligatoires</h3>

                    {uploadCard('cni', "Pièce d'identité (CNI ou Passeport)", 'En cours de validité. Scannez recto-verso en un seul document si possible (PDF, JPG, PNG). Max 5 Mo.', <Contact className="w-8 h-8 text-primary-500 shrink-0" />, true)}

                    {uploadCard('paySlip', 'Dernier bulletin de salaire', 'Document datant de moins de 3 mois prouvant vos revenus récents. (PDF, JPG). Max 5 Mo.', <FileText className="w-8 h-8 text-primary-500 shrink-0" />, true, 'application/pdf,image/jpeg')}

                    {uploadCard('address', 'Justificatif de domicile', "Facture d'électricité, eau, ou internet de moins de 3 mois. (PDF, JPG). Max 5 Mo.", <Home className="w-8 h-8 text-primary-500 shrink-0" />, true, 'application/pdf,image/jpeg')}
                </div>

                <div className="bg-blue-50 border border-primary-200 rounded-xl p-5 mb-8 flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-800 font-medium">
                        Vos documents seront chiffrés et vérifiés manuellement par notre équipe conformité sous 24h ouvrées. Plus votre dossier est complet, plus votre compte sera activé rapidement.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-primary w-full py-4 text-lg font-bold"
                >
                    {isUploading ? "Envoi sécurisé en cours..." : "Soumettre mon dossier KYC"}
                </button>
            </form>
        </div>
    );
}
