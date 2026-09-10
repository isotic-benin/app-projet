'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, CheckCircle, AlertTriangle, User, CreditCard } from 'lucide-react';
import { isValidRibOrIban, isValidBIC } from '@/lib/bank-validation';

export default function RetraitForm({ balance }: { balance: number }) {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const method = 'bank_transfer';
    const [reference, setReference] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [bic, setBic] = useState('');
    const [bankName, setBankName] = useState('');
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
        if (!accountHolder.trim() || accountHolder.trim().length < 2) {
            setError('Veuillez renseigner le titulaire du compte.');
            return;
        }
        const ribCheck = isValidRibOrIban(reference);
        if (!ribCheck.valid) {
            setError(ribCheck.error || 'IBAN / RIB invalide.');
            return;
        }
        if (bic.trim() && !isValidBIC(bic)) {
            setError('BIC invalide — 8 ou 11 caractères (ex: AGRIFRPP).');
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
                    iban: reference.trim(),
                    bic: bic.trim() || undefined,
                    accountHolder: accountHolder.trim(),
                    bankName: bankName.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors du retrait');
            }

            setSuccess(true);
            setAmount('');
            // garder les infos bancaires pour réutilisation
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

                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-primary-200 flex items-center justify-center shrink-0">🏦</div>
                        <div>
                            <p className="text-sm font-bold text-primary-700">Virement bancaire</p>
                            <p className="text-xs text-gray-500">Seul mode de paiement disponible — versement sur votre compte bancaire.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-navy mb-1.5">
                            Titulaire du compte <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                placeholder="Ex: Jean Dupont"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-navy mb-1.5">
                            IBAN / RIB <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value.toUpperCase())}
                                placeholder="Ex: FR76 3000 2005 5000 0015 7840 Z25"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Vérification automatique de la clé RIB/IBAN.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-navy mb-1.5">BIC (optionnel)</label>
                            <input
                                type="text"
                                value={bic}
                                onChange={(e) => setBic(e.target.value.toUpperCase())}
                                placeholder="AGRIFRPP"
                                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-navy mb-1.5">Banque (optionnel)</label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="Ex: BNP"
                                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                            />
                        </div>
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