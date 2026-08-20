'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function DisburseButton({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [method, setMethod] = useState('bank_transfer');

    const handleDisburse = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/loans/disburse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId, method, reference: `VIREMENT-${Date.now()}` })
            });

            if (!res.ok) {
                throw new Error((await res.json()).error || 'Erreur lors du décaissement');
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
                <select
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                    className="bg-navy-700 border border-white/20 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 flex-1"
                >
                    <option value="bank_transfer">Virement Bancaire (Réseau)</option>
                    <option value="mobile_money">Mobile Money (API simulée)</option>
                </select>
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
