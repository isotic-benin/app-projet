'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const resetSchema = z.object({
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetForm>({
        resolver: zodResolver(resetSchema),
    });

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Le lien de réinitialisation est invalide ou manquant.');
        }
    }, [token]);

    const onSubmit = async (data: ResetForm) => {
        if (!token) return;

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: data.password }),
            });

            const result = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(result.message || 'Votre mot de passe a été modifié avec succès.');
                setTimeout(() => {
                    router.push('/connexion');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(result.error || 'Une erreur est survenue.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Une erreur réseau est survenue. Veuillez réessayer.');
        }
    };

    if (!token && status === 'error') {
        return (
            <div className="card w-full animate-fade-in shadow-xl pt-8 pb-10 px-8">
                <h1 className="text-2xl font-bold text-navy mb-6 text-center">Lien invalide</h1>
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
                <div className="text-center">
                    <Link href="/mot-de-passe-oublie" className="btn-secondary w-full py-3 inline-block">
                        Demander un nouveau lien
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="card w-full animate-fade-in shadow-xl pt-8 pb-10 px-8">
            <h1 className="text-2xl font-bold text-navy mb-2 text-center">Nouveau mot de passe</h1>
            <p className="text-sm text-gray-500 text-center mb-6">Définissez votre nouveau mot de passe (8 caractères minimum).</p>

            {status === 'error' && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )}

            {status === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <h3 className="font-bold text-green-800 text-lg">Mot de passe modifié !</h3>
                    <p className="text-sm text-green-700">
                        {message}
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                        Redirection vers la page de connexion en cours...
                    </p>
                    <div className="pt-4">
                        <Link href="/connexion" className="text-primary-500 font-bold hover:underline text-sm">
                            Se connecter maintenant
                        </Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="input-label" htmlFor="password">Nouveau mot de passe</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className={`input-field ${errors.password ? 'border-danger' : ''}`}
                            {...register('password')}
                        />
                        {errors.password && <p className="mt-1.5 text-sm text-danger font-medium">{errors.password.message}</p>}
                    </div>

                    <div>
                        <label className="input-label" htmlFor="confirmPassword">Confirmer le mot de passe</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className={`input-field ${errors.confirmPassword ? 'border-danger' : ''}`}
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && <p className="mt-1.5 text-sm text-danger font-medium">{errors.confirmPassword.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn-primary w-full py-4 text-base mt-4 flex justify-center items-center gap-2"
                    >
                        {status === 'loading' ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Modification en cours...
                            </>
                        ) : (
                            'Enregistrer'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="text-center p-8 text-gray-500">Chargement...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
