'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function GuaranteeValidateButtons({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showReject, setShowReject] = useState(false);
    const [reason, setReason] = useState('');

    const handle = async (decision: 'approve' | 'reject') => {
        if (decision === 'reject' && reason.trim().length < 10) { setError('Motif de rejet requis (min 10 caractères).'); return; }
        setIsProcessing(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/loans/${applicationId}/guarantee/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, reason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');
            router.refresh();
        } catch (e: any) {
            setError(e.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-3">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" /><span className="font-medium">{error}</span>
                </div>
            )}
            {!showReject ? (
                <div className="flex gap-3">
                    <button onClick={() => handle('approve')} disabled={isProcessing} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Valider et marquer payé
                    </button>
                    <button onClick={() => setShowReject(true)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> Rejeter
                    </button>
                </div>
            ) : (
                <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <label className="block text-sm font-bold text-red-800">Motif du rejet *</label>
                    <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Ex: Montant illisible, capture floue, référence manquante..." className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                    <div className="flex gap-3">
                        <button onClick={() => setShowReject(false)} className="flex-1 py-2.5 bg-white border border-border rounded-xl text-sm font-bold">Annuler</button>
                        <button onClick={() => handle('reject')} disabled={isProcessing} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Confirmer le rejet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
