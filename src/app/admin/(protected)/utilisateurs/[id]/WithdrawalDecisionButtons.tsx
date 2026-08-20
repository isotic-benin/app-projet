'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';

export default function WithdrawalDecisionButtons({ transactionId }: { transactionId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState<'validate' | 'reject' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDecision = async (decision: 'validate' | 'reject') => {
        setIsProcessing(decision);
        setError(null);
        try {
            const res = await fetch(`/api/admin/withdrawals/${transactionId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision }),
            });
            if (!res.ok) {
                throw new Error((await res.json()).error || 'Erreur lors du traitement');
            }
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-600 font-bold">{error}</span>}
            <button
                onClick={() => handleDecision('validate')}
                disabled={isProcessing !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
                {isProcessing === 'validate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Valider
            </button>
            <button
                onClick={() => handleDecision('reject')}
                disabled={isProcessing !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors disabled:opacity-50"
            >
                {isProcessing === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Rejeter
            </button>
        </div>
    );
}