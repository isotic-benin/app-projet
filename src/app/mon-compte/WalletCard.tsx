'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, X, Loader2, CheckCircle, AlertTriangle, Building2, User, CreditCard, Landmark } from 'lucide-react';
import { isValidRibOrIban, isValidBIC } from '@/lib/bank-validation';

interface Props {
    balance: number; // en centimes
    lastBankInfo?: {
        holder?: string;
        iban?: string;
        bic?: string;
        bankName?: string;
    } | null;
}

export default function WalletCard({ balance, lastBankInfo }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [accountHolder, setAccountHolder] = useState(lastBankInfo?.holder || '');
    const [iban, setIban] = useState(lastBankInfo?.iban || '');
    const [bic, setBic] = useState(lastBankInfo?.bic || '');
    const [bankName, setBankName] = useState(lastBankInfo?.bankName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const balanceDisplay = (balance / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const canWithdraw = balance > 0;

    const resetForm = () => {
        setError(null);
        setSuccess(null);
    };

    const handleOpen = () => {
        resetForm();
        // Pré-remplir avec dernières infos si disponibles
        if (lastBankInfo?.holder) setAccountHolder(lastBankInfo.holder);
        if (lastBankInfo?.iban) setIban(lastBankInfo.iban);
        setOpen(true);
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        // Validation montant
        const raw = amount.replace(',', '.').trim();
        const parsed = parseFloat(raw);
        if (!parsed || isNaN(parsed) || parsed <= 0) {
            setError('Veuillez saisir un montant valide.');
            return;
        }
        const cents = Math.round(parsed * 100);
        if (cents < 100) {
            setError('Montant minimum : 1 €.');
            return;
        }
        if (cents > balance) {
            setError('Le montant dépasse votre solde disponible.');
            return;
        }

        if (!accountHolder.trim() || accountHolder.trim().length < 2) {
            setError('Veuillez renseigner le titulaire du compte.');
            return;
        }

        const ibanCheck = isValidRibOrIban(iban);
        if (!ibanCheck.valid) {
            setError(ibanCheck.error || 'IBAN / RIB invalide.');
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
                    method: 'bank_transfer',
                    iban: iban.trim(),
                    bic: bic.trim() || undefined,
                    accountHolder: accountHolder.trim(),
                    bankName: bankName.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande de retrait');

            setSuccess(data.message || 'Demande enregistrée. Vous recevrez votre virement sous 24-48h ouvrées.');
            setAmount('');
            // Ne pas reset IBAN/holder pour réutilisation future
            setTimeout(() => {
                setOpen(false);
                setSuccess(null);
                router.refresh();
            }, 1800);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* CARD */}
            <div className="card w-full shadow-sm transition-shadow bg-gradient-to-br from-navy to-primary-700 text-white border-none flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider">Mon portefeuille</h2>
                    <Wallet className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-3xl font-extrabold font-mono mb-1">{balanceDisplay} €</p>
                <p className="text-primary-200 text-xs mb-4">Solde disponible</p>

                <button
                    onClick={handleOpen}
                    disabled={!canWithdraw}
                    className={`w-full text-center text-sm py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        canWithdraw
                            ? 'bg-white text-navy hover:bg-gray-50 shadow-md'
                            : 'bg-white/40 text-white/70 cursor-not-allowed'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    {canWithdraw ? 'Retirer de l\'argent' : 'Aucun solde à retirer'}
                </button>

                {!canWithdraw && (
                    <p className="text-[11px] text-white/60 mt-2 text-center">
                        Votre prêt sera crédité ici après déblocage par notre équipe.
                    </p>
                )}
            </div>

            {/* MODAL */}
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => !isSubmitting && setOpen(false)} />

                    <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                    <Landmark className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-navy">Retirer mes fonds</h3>
                                    <p className="text-xs text-gray-500">Virement bancaire sécurisé</p>
                                </div>
                            </div>
                            <button
                                onClick={() => !isSubmitting && setOpen(false)}
                                className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Solde rappel */}
                            <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Solde disponible</span>
                                <span className="font-extrabold text-navy font-mono">{balanceDisplay} €</span>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200">
                                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span className="font-medium">{success}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-navy mb-1.5">
                                        Montant à retirer (€) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        max={balance / 100}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-lg font-bold text-navy font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Maximum : {balanceDisplay} €</p>
                                </div>

                                <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary-600 shrink-0" />
                                    <p className="text-xs text-primary-800 font-medium">Virement bancaire — seul mode de paiement disponible.</p>
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
                                            value={iban}
                                            onChange={(e) => setIban(e.target.value.toUpperCase())}
                                            placeholder="Ex: FR76 3000 2005 5000 0015 7840 Z25"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Accepte IBAN (FR76...) ou RIB 23 caractères. Vérification automatique de la clé.
                                    </p>
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
                                            placeholder="Ex: BNP Paris"
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 bg-gray-50 border border-border rounded-xl p-3">
                                    Vos fonds seront virés sur le compte indiqué sous <strong>24-48h ouvrées</strong>. Assurez-vous que les informations sont exactes.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex gap-3 shrink-0">
                            <button
                                onClick={() => !isSubmitting && setOpen(false)}
                                className="flex-1 py-3 rounded-xl border border-border bg-white text-navy font-bold text-sm hover:bg-gray-50 transition-colors"
                                disabled={isSubmitting}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Valider le retrait
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
