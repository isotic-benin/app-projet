'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from '@/lib/validators';
import { AlertTriangle } from 'lucide-react';

type LoginForm = z.infer<typeof loginSchema>;

export default function ClientLoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await signIn('client-credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (res?.error) {
                setError('Email ou mot de passe incorrect, ou compte non vérifié.');
            } else if (res?.ok) {
                router.push('/mon-compte');
                router.refresh();
            }
        } catch (err) {
            setError('Une erreur est survenue lors de la connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card w-full animate-fade-in shadow-xl pt-8 pb-10 px-8">
            <h1 className="text-2xl font-bold text-navy mb-6 text-center">Espace Client</h1>

            {error && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label className="input-label" htmlFor="email">Adresse email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="votre.email@exemple.com"
                        className={`input-field ${errors.email ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        {...register('email')}
                    />
                    {errors.email && <p className="mt-1.5 text-sm text-danger font-medium">{errors.email.message}</p>}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="input-label mb-0" htmlFor="password">Mot de passe</label>
                        <Link href="/mot-de-passe-oublie" className="text-sm font-semibold text-primary-500 hover:underline">
                            Oublié ?
                        </Link>
                    </div>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className={`input-field ${errors.password ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        {...register('password')}
                    />
                    {errors.password && <p className="mt-1.5 text-sm text-danger font-medium">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-4 text-base mt-2"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connexion en cours...
                        </span>
                    ) : (
                        'Se connecter'
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-sm text-gray-500 font-medium font-sans">
                    Vous n'avez pas encore de compte ?{' '}
                    <Link href="/inscription" className="text-primary-500 font-bold hover:underline">
                        Créer un compte
                    </Link>
                </p>
            </div>
        </div>
    );
}
