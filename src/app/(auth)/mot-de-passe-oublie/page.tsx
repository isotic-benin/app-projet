'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setStatus('error');
            setMessage('Veuillez entrer une adresse email valide.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Une erreur est survenue.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Une erreur réseau est survenue. Veuillez réessayer.');
        }
    };

    return (
        <div className="card w-full animate-fade-in shadow-xl pt-8 pb-10 px-8">
            <h1 className="text-2xl font-bold text-navy mb-2 text-center">Mot de passe oublié</h1>
            <p className="text-sm text-gray-500 text-center mb-6">Saisissez votre adresse email pour recevoir un lien de réinitialisation sécurisé.</p>

            {status === 'error' && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )}

            {status === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <h3 className="font-bold text-green-800 text-lg">Email envoyé !</h3>
                    <p className="text-sm text-green-700">
                        {message}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                        Pensez à vérifier vos courriers indésirables (spams).
                    </p>
                    <div className="pt-4">
                        <Link href="/connexion" className="text-primary-500 font-bold hover:underline text-sm">
                            ← Retour à la connexion
                        </Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                        <label className="input-label" htmlFor="email">Adresse email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="votre.email@exemple.com"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn-primary w-full py-4 text-base mt-2 flex justify-center items-center gap-2"
                    >
                        {status === 'loading' ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Envoi en cours...
                            </>
                        ) : (
                            'Envoyer le lien'
                        )}
                    </button>
                </form>
            )}

            {status !== 'success' && (
                <div className="mt-8 pt-6 border-t border-border text-center">
                    <p className="text-sm text-gray-500 font-medium font-sans">
                        Je me souviens de mon mot de passe.{' '}
                        <Link href="/connexion" className="text-primary-500 font-bold hover:underline">
                            Se connecter
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
}
