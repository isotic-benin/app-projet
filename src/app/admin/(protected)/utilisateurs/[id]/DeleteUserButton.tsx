'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, X, ShieldAlert } from 'lucide-react';

interface Props {
    userId: string;
    email: string;
    clientNumber?: string;
    name: string;
}

export default function DeleteUserButton({ userId, email, clientNumber, name }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = confirmEmail.trim().toLowerCase() === email.toLowerCase() && confirmText.trim().toUpperCase() === 'SUPPRIMER';

    const handleDelete = async () => {
        if (!canSubmit) {
            setError('Confirmez avec l’email exact et le mot SUPPRIMER.');
            return;
        }
        setIsDeleting(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmEmail, confirmText }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
            setOpen(false);
            router.push('/admin/utilisateurs');
            router.refresh();
        } catch (e: any) {
            setError(e.message);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium text-sm transition-colors"
                title="Supprimer définitivement ce compte et toutes ses données"
            >
                <Trash2 className="w-4 h-4" />
                Supprimer le compte
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => !isDeleting && setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                    <ShieldAlert className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-navy">Supprimer le compte</h3>
                                    <p className="text-xs text-gray-500">Action irréversible</p>
                                </div>
                            </div>
                            <button onClick={() => !isDeleting && setOpen(false)} className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-800">
                                        <p className="font-bold">Vous allez supprimer définitivement :</p>
                                        <p className="font-semibold mt-1">{name} · {email} {clientNumber ? `· ${clientNumber}` : ''}</p>
                                        <ul className="list-disc list-inside mt-2 space-y-0.5 text-red-700">
                                            <li>Son compte client</li>
                                            <li>Tous ses prêts ({`dossiers`})</li>
                                            <li>Toutes ses transactions (garanties, déblocages, retraits)</li>
                                            <li>Ses échéanciers, notifications, logs d’audit & emails liés</li>
                                        </ul>
                                        <p className="mt-3 font-bold">Cette opération est irréversible.</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                                    <AlertTriangle className="w-5 h-5 shrink-0" /><span className="font-medium">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-navy mb-1.5">Saisissez l’email du client pour confirmer *</label>
                                <input
                                    type="email"
                                    value={confirmEmail}
                                    onChange={e => setConfirmEmail(e.target.value)}
                                    placeholder={email}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                />
                                <p className="text-xs text-gray-400 mt-1">Email attendu : <span className="font-mono">{email}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-navy mb-1.5">Saisissez <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">SUPPRIMER</span> *</label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder="SUPPRIMER"
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex gap-3">
                            <button onClick={() => !isDeleting && setOpen(false)} disabled={isDeleting} className="flex-1 py-3 rounded-xl border border-border bg-white text-navy font-bold text-sm hover:bg-gray-50 disabled:opacity-60">Annuler</button>
                            <button onClick={handleDelete} disabled={!canSubmit || isDeleting} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-600/20">
                                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</> : <><Trash2 className="w-4 h-4" /> Supprimer définitivement</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
