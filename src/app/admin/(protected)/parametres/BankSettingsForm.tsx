'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, AlertTriangle, Loader2, CreditCard, Landmark, Info } from 'lucide-react';

interface BankInfo {
    guarantee_bank_holder?: string;
    guarantee_bank_iban?: string;
    guarantee_bank_bic?: string;
    guarantee_bank_name?: string;
    guarantee_bank_instructions?: string;
}

export default function BankSettingsForm({ initial }: { initial: BankInfo }) {
    const [holder, setHolder] = useState(initial.guarantee_bank_holder || '');
    const [iban, setIban] = useState(initial.guarantee_bank_iban || '');
    const [bic, setBic] = useState(initial.guarantee_bank_bic || '');
    const [name, setName] = useState(initial.guarantee_bank_name || '');
    const [instructions, setInstructions] = useState(initial.guarantee_bank_instructions || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError(null);
        setSuccess(false);
        if (!holder.trim() || holder.trim().length < 2) { setError('Titulaire requis.'); return; }
        if (!iban.trim()) { setError('IBAN / RIB requis.'); return; }
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bank: { holder, iban, bic, name, instructions } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la sauvegarde');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white border border-border rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <h2 className="font-bold text-navy">Compte de dépôt – Garantie & frais</h2>
                    <p className="text-xs text-gray-500">Ces coordonnées apparaîtront dans le mail envoyé au client après validation du contrat.</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" /><span className="font-medium">{error}</span>
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200">
                    <CheckCircle className="w-5 h-5 shrink-0" /><span className="font-medium">Coordonnées bancaires enregistrées.</span>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-navy mb-1.5">Titulaire du compte *</label>
                    <input value={holder} onChange={e=>setHolder(e.target.value)} placeholder="Ex: ALTIA FINANCE SARL" className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-navy mb-1.5">IBAN / RIB *</label>
                    <div className="relative">
                        <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={iban} onChange={e=>setIban(e.target.value.toUpperCase())} placeholder="Ex: FR76 3000 2005 5000 0015 7840 Z25 ou RIB 23c" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Vérification automatique de la clé RIB/IBAN.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-navy mb-1.5">BIC</label>
                    <input value={bic} onChange={e=>setBic(e.target.value.toUpperCase())} placeholder="AGRIFRPP" className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-navy mb-1.5">Nom de la banque</label>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: BNP Paribas" className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-navy mb-1.5">Instructions complémentaires (optionnel)</label>
                    <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} placeholder="Ex: Référence à indiquer : Dossier LN-... + nom complet. Les frais de virement restent à la charge du client." className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
                </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">Ce RIB sera inclus dans l’email automatique envoyé au client lorsqu’un admin valide son contrat signé et clique sur « Demander le versement de la garantie ».</p>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-primary-500/20">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer les coordonnées</>}
            </button>
        </div>
    );
}
