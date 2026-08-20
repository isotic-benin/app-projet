'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Car, Hammer, Zap, AlertTriangle } from 'lucide-react';

const PRODUCTS = [
    { id: 'pret-personnel', name: 'Prêt Personnel', icon: <Briefcase className="w-6 h-6 text-primary-500" />, rate: 14.5, maxAmount: 500000, minDuration: 6, maxDuration: 60 },
    { id: 'pret-auto', name: 'Prêt Auto', icon: <Car className="w-6 h-6 text-primary-500" />, rate: 13.5, maxAmount: 500000, minDuration: 12, maxDuration: 84 },
    { id: 'pret-travaux', name: 'Prêt Travaux', icon: <Hammer className="w-6 h-6 text-primary-500" />, rate: 15.0, maxAmount: 500000, minDuration: 12, maxDuration: 72 },
    { id: 'mini-pret', name: 'Mini Prêt Express', icon: <Zap className="w-6 h-6 text-primary-500" />, rate: 18.0, maxAmount: 500000, minDuration: 1, maxDuration: 12 },
];

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const r = annualRate / 100 / 12;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

function generateAmortizationTable(principal: number, annualRate: number, months: number) {
    const r = annualRate / 100 / 12;
    const monthly = computeMonthlyPayment(principal, annualRate, months);
    const rows = [];
    let remaining = principal;

    for (let i = 1; i <= months; i++) {
        const interest = Math.round(remaining * r);
        const capitalPaid = monthly - interest;
        remaining = Math.max(0, remaining - capitalPaid);
        rows.push({ month: i, payment: monthly, interest, capital: capitalPaid, remaining });
    }
    return rows;
}

export default function LoanApplicationForm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
    const [amount, setAmount] = useState(5000);
    const [duration, setDuration] = useState(12);
    const [purpose, setPurpose] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const monthlyPayment = useMemo(() => computeMonthlyPayment(amount, selectedProduct.rate, duration), [amount, selectedProduct, duration]);
    const totalCost = monthlyPayment * duration;
    const totalInterest = totalCost - amount;
    const amortization = useMemo(() => generateAmortizationTable(amount, selectedProduct.rate, duration), [amount, selectedProduct, duration]);

    const handleSubmit = async () => {
        if (!purpose.trim() || purpose.trim().length < 10) {
            setError("Veuillez décrire l'usage prévu du crédit (10 caractères minimum).");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const body = {
                productId: selectedProduct.id,
                amount,
                duration,
                purpose: purpose.trim(),
            };

            const res = await fetch('/api/loans/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors de la soumission');
            }

            router.push('/mon-compte/prets?submitted=true');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full animate-fade-in">
            <Link href="/mon-compte" className="text-sm text-gray-500 font-semibold mb-4 inline-block hover:text-primary-500">
                ← Retour au tableau de bord
            </Link>
            <h1 className="text-3xl font-extrabold text-navy mb-2">Demande de crédit</h1>
            <p className="text-gray-500 mb-8">Simulez, choisissez et soumettez votre demande en quelques minutes. Aucun paiement requis pour soumettre votre demande.</p>

            {/* Stepper indicator */}
            <div className="flex items-center justify-center mb-10">
                {['Simulation', 'Amortissement', 'Confirmation'].map((label, i) => {
                    const num = i + 1;
                    return (
                        <div key={label} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === num ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' :
                                    step > num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {step > num ? '✓' : num}
                                </div>
                                <span className={`text-xs mt-2 font-semibold ${step === num ? 'text-primary-500' : 'text-gray-400'}`}>{label}</span>
                            </div>
                            {num < 3 && <div className={`w-16 h-0.5 mx-3 mb-5 ${step > num ? 'bg-green-400' : 'bg-gray-200'}`} />}
                        </div>
                    );
                })}
            </div>

            {error && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* ──── STEP 1: Simulation ──── */}
            {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card shadow-sm p-6">
                        <h2 className="font-bold text-navy text-lg mb-4">1. Choisissez votre type de crédit</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {PRODUCTS.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedProduct(p); setAmount(Math.min(amount, p.maxAmount)); setDuration(Math.max(p.minDuration, Math.min(duration, p.maxDuration))); }}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedProduct.id === p.id ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-border hover:border-primary-300'
                                        }`}
                                >
                                    <div className="mb-2">{p.icon}</div>
                                    <div className="font-bold text-sm text-navy">{p.name}</div>
                                    <div className="text-xs text-primary-500 font-semibold mt-1">{p.rate}% / an</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card shadow-sm p-6 space-y-6">
                        <h2 className="font-bold text-navy text-lg">2. Ajustez votre simulation</h2>

                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <label className="input-label mb-0">Montant souhaité</label>
                                <span className="text-lg font-extrabold text-navy">{amount.toLocaleString('fr-FR')} €</span>
                            </div>
                            <input
                                type="range"
                                min={500}
                                max={selectedProduct.maxAmount}
                                step={500}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>500</span>
                                <span>{selectedProduct.maxAmount.toLocaleString('fr-FR')}</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <label className="input-label mb-0">Durée de remboursement</label>
                                <span className="text-lg font-extrabold text-navy">{duration} mois</span>
                            </div>
                            <input
                                type="range"
                                min={selectedProduct.minDuration}
                                max={selectedProduct.maxDuration}
                                step={1}
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>{selectedProduct.minDuration} mois</span>
                                <span>{selectedProduct.maxDuration} mois</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-xl">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-blue-200 text-xs font-medium">Mensualité</p>
                                <p className="text-2xl font-extrabold">{monthlyPayment.toLocaleString('fr-FR')} <span className="text-sm">€</span></p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs font-medium">Coût total du crédit</p>
                                <p className="text-lg font-bold">{totalInterest.toLocaleString('fr-FR')} €</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs font-medium">Total à rembourser</p>
                                <p className="text-lg font-bold">{totalCost.toLocaleString('fr-FR')} €</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setStep(2)} className="btn-primary w-full py-4 text-base">
                        Voir le tableau d'amortissement →
                    </button>
                </div>
            )}

            {/* ──── STEP 2: Amortization Table ──── */}
            {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card shadow-sm p-6">
                        <h2 className="font-bold text-navy text-lg mb-4">Tableau d'amortissement prévisionnel</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            {selectedProduct.name} · {amount.toLocaleString('fr-FR')} € · {duration} mois · {selectedProduct.rate}% / an
                        </p>

                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-border rounded-xl">
                            <table className="min-w-full text-sm">
                                <thead className="bg-surface sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-navy">Mois</th>
                                        <th className="px-4 py-3 text-right font-semibold text-navy">Mensualité</th>
                                        <th className="px-4 py-3 text-right font-semibold text-navy">Capital</th>
                                        <th className="px-4 py-3 text-right font-semibold text-navy">Intérêts</th>
                                        <th className="px-4 py-3 text-right font-semibold text-navy">Restant dû</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {amortization.map((row) => (
                                        <tr key={row.month} className="hover:bg-primary-50/50 transition-colors">
                                            <td className="px-4 py-2.5 text-navy font-medium">{row.month}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-sm">{row.payment.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-sm text-green-600">{row.capital.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-sm text-amber-600">{row.interest.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-sm">{row.remaining.toLocaleString('fr-FR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3.5">← Modifier la simulation</button>
                        <button onClick={() => setStep(3)} className="btn-primary flex-[2] py-3.5">Confirmer ma demande →</button>
                    </div>
                </div>
            )}

            {/* ──── STEP 3: Confirm & Submit ──── */}
            {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card shadow-sm p-6">
                        <h2 className="font-bold text-navy text-lg mb-6">Résumé de votre demande</h2>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                            <div className="bg-surface rounded-xl p-4">
                                <p className="text-gray-500 text-xs font-medium">Produit</p>
                                <p className="font-bold text-navy">{selectedProduct.icon} {selectedProduct.name}</p>
                            </div>
                            <div className="bg-surface rounded-xl p-4">
                                <p className="text-gray-500 text-xs font-medium">Montant emprunté</p>
                                <p className="font-bold text-navy">{amount.toLocaleString('fr-FR')} €</p>
                            </div>
                            <div className="bg-surface rounded-xl p-4">
                                <p className="text-gray-500 text-xs font-medium">Durée</p>
                                <p className="font-bold text-navy">{duration} mois</p>
                            </div>
                            <div className="bg-surface rounded-xl p-4">
                                <p className="text-gray-500 text-xs font-medium">Mensualité</p>
                                <p className="font-bold text-primary-500">{monthlyPayment.toLocaleString('fr-FR')} €</p>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Usage prévu du crédit</label>
                            <textarea
                                className="input-field"
                                rows={3}
                                placeholder="Ex: Achat d'un véhicule pour mon activité professionnelle..."
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-primary-200 rounded-xl p-5">
                        <p className="text-sm text-blue-800 font-medium">
                            Aucun paiement n'est requis à cette étape. Après étude de votre dossier, nos équipes vous contacteront par email avec les conditions définitives du prêt (dépôt de garantie de 10% et frais d'étude de dossier) sous forme de contrat.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3.5" disabled={isSubmitting}>← Retour</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-500/20 text-white rounded-xl flex-[2] py-4 text-base font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-green-500/10"
                        >
                            {isSubmitting ? 'Envoi du dossier...' : 'Soumettre ma demande'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
