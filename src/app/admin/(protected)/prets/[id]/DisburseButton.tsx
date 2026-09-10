'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function DisburseButton({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const method = 'bank_transfer';

    const handleDisburse = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/loans/disburse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId, method, reference: `VIREMENT-${Date.now()}` })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors du décaissement');
            }
            if (data.alreadyDisbursed) {
                setError('Prêt déjà débloqué — aucune nouvelle opération effectuée.');
                return;
            }

            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {error && (
                <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm font-bold border border-red-500/50">
                    <AlertTriangle className="w-4 h-4 inline mr-1" /> {error}
                </div>
            )}
            <div className="flex gap-4 items-center">
                <div className="flex-1 bg-navy-700 border border-white/20 text-white text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <span>🏦</span> Virement bancaire
                </div>
                <button
                    onClick={handleDisburse}
                    disabled={isProcessing}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                    {isProcessing ? 'Génération et virements...' : 'Confirmer et Décaisser'}
                </button>
            </div>
        </div>
    );
}
