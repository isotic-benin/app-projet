'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function EvaluateKycForm({ userId }: { userId: string }) {
    const router = useRouter();
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (action === 'reject' && reason.trim().length < 10) {
            setError("Veuillez fournir un motif de rejet clair (10 caractères minimum).");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/kyc/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, decision: action, reason }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur interne du serveur.');
            }

            router.push('/admin/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-navy-600 border border-white/10 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-6">Action de Vérification</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-medium text-red-200">{error}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                    onClick={() => setAction('approve')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${action === 'approve'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-navy-700/50 border-white/10 text-white hover:border-white/30'
                        }`}
                >
                    <CheckCircle className="w-4 h-4 mr-1 inline" /> Approuver le dossier KYC
                </button>
                <button
                    onClick={() => setAction('reject')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${action === 'reject'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-navy-700/50 border-white/10 text-white hover:border-white/30'
                        }`}
                >
                    <XCircle className="w-4 h-4 mr-1 inline" /> Rejeter le dossier
                </button>
            </div>

            {action === 'reject' && (
                <div className="mb-6 animate-fade-in">
                    <label className="block text-sm font-medium text-navy-200 mb-2">Motif du rejet (Envoyé au client par email)</label>
                    <textarea
                        className="w-full bg-navy-700 border border-white/20 rounded-xl p-4 text-white placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        placeholder="Ex: La pièce d'identité est expirée ou illisible..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            )}

            {action && (
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-50"
                >
                    {isLoading ? 'Traitement...' : 'Confirmer la décision'}
                </button>
            )}
        </div>
    );
}
