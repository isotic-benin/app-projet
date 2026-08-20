'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RetraitForm({ balance }: { balance: number }) {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('mobile_money');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const balanceDisplay = (balance / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

    const handleSubmit = async () => {
        setError(null);
        setSuccess(false);

        const parsed = parseFloat(amount.replace(',', '.'));
        if (!parsed || parsed <= 0) {
            setError('Veuillez saisir un montant valide.');
            return;
        }
        if (Math.round(parsed * 100) > balance) {
            setError('Le montant dépasse votre solde disponible.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/loans/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parsed,
                    method,
                    reference,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors du retrait');
            }

            setSuccess(true);
            setAmount('');
            setReference('');
            setTimeout(() => router.refresh(), 1200);
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in py-6">
            <div className="card shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-navy">Retrait de fonds</h1>
                        <p className="text-sm text-gray-500">Retirez l'argent disponible sur votre portefeuille.</p>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 mb-6 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Solde disponible</p>
                    <p className="text-3xl font-extrabold text-navy font-mono mt-1">{balanceDisplay} €</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm mb-4">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <span className="font-medium">Demande de retrait enregistrée. Vos fonds sont en cours de traitement (24-48h).</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-navy mb-1.5">Montant à retirer (€)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-lg font-bold text-navy font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-navy mb-1.5">Mode de réception</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod('mobile_money')}
                                className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${method === 'mobile_money' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-border bg-surface text-gray-500 hover:bg-gray-50'}`}
                            >
                                Mobile Money
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('bank_transfer')}
                                className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${method === 'bank_transfer' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-border bg-surface text-gray-500 hover:bg-gray-50'}`}
                            >
                                Virement bancaire
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-navy mb-1.5">
                            {method === 'mobile_money' ? 'Numéro Mobile Money' : 'IBAN / coordonnées bancaires'}
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder={method === 'mobile_money' ? 'Ex: +229 01 23 45 67 89' : 'Ex: BJ23 0000 0000 0000 0000'}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Traitement...
                            </>
                        ) : (
                            <>
                                <Wallet className="w-5 h-5" />
                                Effectuer le retrait
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}