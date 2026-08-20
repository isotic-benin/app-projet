'use client';

import { useState } from 'react';
import Link from 'next/link';

const DURATIONS = [6, 12, 24, 36];
const RATE = 14.5; // Taux annuel indicatif

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const r = (annualRate / 100) / 12;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

function formatNumber(n: number): string {
    return n.toLocaleString('fr-FR');
}

export default function HeroSimulator() {
    const [amount, setAmount] = useState(5000);
    const [duration, setDuration] = useState(6);

    const monthly = computeMonthlyPayment(amount, RATE, duration);
    const totalCost = monthly * duration;
    const totalInterest = totalCost - amount;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-simulator text-navy">
            <h2 className="text-lg font-bold text-navy mb-5">Simulez votre crédit</h2>

            <div className="space-y-5">
                {/* Montant */}
                <div>
                    <label className="input-label">Montant souhaité</label>
                    <div className="relative">
                        <input
                            type="range"
                            min={500}
                            max={500000}
                            step={500}
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500 mb-2"
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-2xl font-extrabold text-navy">{formatNumber(amount)}</span>
                            <span className="text-sm text-gray-400 font-medium">€</span>
                        </div>
                    </div>
                </div>

                {/* Durée */}
                <div>
                    <label className="input-label">Durée</label>
                    <div className="grid grid-cols-4 gap-2">
                        {DURATIONS.map((m) => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className={`py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200
                                    ${duration === m
                                        ? 'border-primary-500 text-primary-500 bg-primary-50'
                                        : 'border-border text-navy hover:border-primary-500 hover:text-primary-500'
                                    }`}
                            >
                                {m} mois
                            </button>
                        ))}
                    </div>
                </div>

                {/* Résultat */}
                <div className="bg-surface rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Mensualité estimée</span>
                        <span className="text-2xl font-extrabold text-primary-500">{formatNumber(monthly)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Coût total du crédit : {formatNumber(totalCost)} €</span>
                        <span>Intérêts : {formatNumber(totalInterest)} €</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Taux indicatif {RATE}% / an · TAEG {(RATE + 1.7).toFixed(1)}%</p>
                </div>

                <Link href="/inscription" className="btn-primary w-full text-base py-4 block text-center">
                    Lancer ma demande →
                </Link>
            </div>
        </div>
    );
}
