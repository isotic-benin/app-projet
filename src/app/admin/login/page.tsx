'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminLoginSchema } from '@/lib/validators';
import Link from 'next/link';
import BrandLogo from '@/components/ui/BrandLogo';

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AdminLoginForm>({
        resolver: zodResolver(adminLoginSchema),
    });

    const onSubmit = async (data: AdminLoginForm) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await signIn('admin-credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (res?.error) {
                setError('Identifiants invalides.');
            } else if (res?.ok) {
                router.push('/admin/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Erreur système, veuillez réessayer.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex">
                        <BrandLogo variant="light" size="md" />
                    </Link>
                    <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-white uppercase opacity-90">
                        Portail Administrateur
                    </h2>
                </div>

                <div className="bg-navy-600 py-8 px-4 shadow rounded-2xl border border-navy-400/30 sm:px-10">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                            <AlertTriangle className="text-red-500 w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium text-red-200">{error}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium leading-6 text-blue-100">
                                Email professionnel
                            </label>
                            <div className="mt-2">
                                <input
                                    id="email"
                                    type="email"
                                    className="block w-full rounded-xl border-0 py-2.5 px-4 bg-navy-500 text-white shadow-sm ring-1 ring-inset ring-navy-400 focus:ring-2 focus:ring-inset focus:ring-primary-400 sm:text-sm sm:leading-6"
                                    {...register('email')}
                                />
                                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-blue-100">
                                Mot de passe
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    type="password"
                                    className="block w-full rounded-xl border-0 py-2.5 px-4 bg-navy-500 text-white shadow-sm ring-1 ring-inset ring-navy-400 focus:ring-2 focus:ring-inset focus:ring-primary-400 sm:text-sm sm:leading-6"
                                    {...register('password')}
                                />
                                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
                            </div>
                        </div>

                        {/* 2FA block removed */}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full justify-center rounded-xl bg-primary-500 px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                            >
                                {isLoading ? 'Authentification...' : 'Connexion sécurisée'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
