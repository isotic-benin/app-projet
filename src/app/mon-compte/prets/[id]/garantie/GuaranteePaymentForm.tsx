'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, Loader2, Smartphone } from 'lucide-react';

export default function GuaranteePaymentForm({
    applicationId,
    guaranteeAmount,
}: {
    applicationId: string;
    guaranteeAmount: number;
}) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handlePay = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            await new Promise(r => setTimeout(r, 1500));

            const res = await fetch('/api/loans/guarantee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationId,
                    useBalance: false,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors du paiement');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/mon-compte/prets');
                router.refresh();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Garantie versée !</h3>
                <p className="text-gray-500">Redirection vers vos crédits...</p>
            </div>
        );
    }

    const guaranteeDisplay = (guaranteeAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-4 text-left">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-primary-500" />
                <div>
                    <p className="text-xs text-gray-500">Paiement par Mobile Money</p>
                    <p className="font-bold text-navy">{guaranteeDisplay} €</p>
                </div>
            </div>

            <button
                onClick={handlePay}
                disabled={isProcessing}
                className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                    </>
                ) : (
                    `Payer ${guaranteeDisplay} € par Mobile Money`
                )}
            </button>

            <p className="text-xs text-gray-400 text-center">
                Simulation de paiement — aucun débit réel ne sera effectué dans cette version de démonstration.
            </p>
        </div>
    );
}
