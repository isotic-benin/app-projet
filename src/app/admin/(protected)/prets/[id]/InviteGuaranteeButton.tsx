'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandCoins, Check, Loader2, AlertTriangle } from 'lucide-react';

export default function InviteGuaranteeButton({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInvite = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/loans/${applicationId}/invite-guarantee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                throw new Error((await res.json()).error || 'Erreur lors de l\'envoi de l\'invitation');
            }
            setSent(true);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    if (sent) {
        return (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <Check className="w-4 h-4" />
                Invitation envoyée au client (notification)
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}
            <button
                onClick={handleInvite}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandCoins className="w-4 h-4" />}
                {isProcessing ? 'Envoi...' : 'Inviter au dépôt de la garantie'}
            </button>
        </div>
    );
}