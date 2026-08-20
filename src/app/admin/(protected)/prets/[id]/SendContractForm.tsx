'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SendContractForm({ applicationId }: { applicationId: string }) {
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch(`/api/admin/loans/${applicationId}/send-contract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject.trim() || undefined,
                    customMessage: customMessage.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de l\'envoi du contrat');
            }

            setSuccess(true);
            setSubject('');
            setCustomMessage('');
            setTimeout(() => router.refresh(), 800);
        } catch (err: any) {
            setError(err.message);
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-navy">Contrat & Conditions du prêt</h3>
                    <p className="text-sm text-gray-500">
                        Envoyez au client le contrat de prêt au format PDF avec toutes les conditions (garantie 10%, frais d'étude, taux d'intérêt, échéancier). Le contrat est généré et joint automatiquement à l'email.
                    </p>
                </div>
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
                    <span className="font-medium">Contrat envoyé par email au client.</span>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-navy mb-1.5">Objet de l'email</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Contrat de prêt — Dossier CRD-... (laissez vide pour un objet automatique)"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-navy mb-1.5">Message personnalisé (optionnel)</label>
                    <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                        placeholder="Ex: Bonjour, suite à l'étude de votre dossier, nous avons le plaisir de vous adresser les conditions définitives de votre prêt..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-y"
                    />
                </div>

                <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-4 text-xs text-gray-600 leading-relaxed">
                    Le contrat PDF reprend automatiquement : le montant et la durée du prêt, le taux d'intérêt, la mensualité, le dépôt de garantie (10%), les frais d'étude de dossier (50 €), l'échéancier prévisionnel et les mentions légales.
                </div>

                <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
                >
                    {isSending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Envoi en cours...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Envoyer le contrat par email
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
