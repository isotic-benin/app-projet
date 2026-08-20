'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';

export default function AdminDecisionButtons({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDecision = async (decision: 'approve' | 'reject') => {
        if (decision === 'reject' && !showRejectForm) {
            setShowRejectForm(true);
            return;
        }

        if (decision === 'reject' && (!rejectReason.trim() || rejectReason.trim().length < 5)) {
            setError("Veuillez fournir une raison valide pour le refus (min 5 caractères).");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/loans/${applicationId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, reason: rejectReason }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors de la décision');
            }

            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    if (showRejectForm) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 animate-fade-in">
                <h3 className="font-bold text-red-900 text-sm mb-3">Motif du refus</h3>
                <textarea
                    className="w-full text-sm border-red-200 focus:border-red-500 focus:ring-red-500 rounded-lg bg-white p-3 mb-3"
                    rows={3}
                    placeholder="Ex: Taux d'endettement trop élevé, pièces justificatives non conformes..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    disabled={isProcessing}
                />

                {error && <p className="text-red-600 text-xs font-bold mb-3">{error}</p>}

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowRejectForm(false)}
                        disabled={isProcessing}
                        className="flex-1 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => handleDecision('reject')}
                        disabled={isProcessing}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Confirmer le Refus
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">{error}</p>}

            <button
                onClick={() => handleDecision('approve')}
                disabled={isProcessing}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-base font-bold transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        Approuver le dossier
                    </>
                )}
            </button>

            <button
                onClick={() => handleDecision('reject')}
                disabled={isProcessing}
                className="w-full py-3 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
                <X className="w-4 h-4" />
                Refuser le dossier
            </button>
        </div>
    );
}
