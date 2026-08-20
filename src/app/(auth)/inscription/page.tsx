'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerUserSchema } from '@/lib/validators';
import { AlertTriangle } from 'lucide-react';

type RegisterForm = z.infer<typeof registerUserSchema>;

export default function RegistrationPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        trigger,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerUserSchema),
        mode: 'onTouched',
    });

    const nextStep = async (e: React.MouseEvent) => {
        e.preventDefault();
        let fieldsToValidate: (keyof RegisterForm)[] = [];

        if (step === 1) fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth'];
        else if (step === 2) fieldsToValidate = ['email', 'phone', 'password'];
        else if (step === 3) fieldsToValidate = ['nationalIdType', 'nationalIdNumber', 'profession', 'monthlyIncome', 'address'];

        const isValid = await trigger(fieldsToValidate);
        if (isValid) setStep((s) => s + 1);
    };

    const prevStep = (e: React.MouseEvent) => {
        e.preventDefault();
        setStep((s) => s - 1);
    };

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Erreur lors de la création du compte');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="card w-full animate-fade-in shadow-xl pt-10 pb-12 px-8 text-center border-t-4 border-primary-500">
                <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-navy mb-4">Compte créé avec succès !</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                    Nous vous avons envoyé un email de vérification. Veuillez cliquer sur le lien contenu dans cet email pour valider votre compte.
                </p>
                <Link href="/connexion" className="btn-primary">
                    Retour à la connexion
                </Link>
            </div>
        );
    }

    return (
        <div className="card w-full animate-fade-in shadow-xl pt-8 pb-10 px-6 sm:px-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-navy mb-2 text-center">Créer mon compte</h1>
            <p className="text-sm text-gray-500 text-center mb-6">Étape {step} sur 3</p>

            {/* Stepper Progress */}
            <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === num ? 'stepper-step-active' : step > num ? 'stepper-step-done' : 'stepper-step-inactive'
                                }`}
                        >
                            {step > num ? '✓' : num}
                        </div>
                        {num < 3 && (
                            <div className={`w-12 h-1 mx-2 rounded-full transition-colors ${step > num ? 'bg-primary-200' : 'bg-gray-100'}`} />
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div className="alert-danger mb-6">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>

                {/* STEP 1: Personal Info */}
                <div className={step === 1 ? 'block animate-fade-in space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="input-label" htmlFor="firstName">Prénom</label>
                            <input id="firstName" className="input-field" placeholder="Jean" {...register('firstName')} />
                            {errors.firstName && <p className="mt-1 text-xs text-danger">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label className="input-label" htmlFor="lastName">Nom</label>
                            <input id="lastName" className="input-field" placeholder="Dupont" {...register('lastName')} />
                            {errors.lastName && <p className="mt-1 text-xs text-danger">{errors.lastName.message}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="input-label" htmlFor="dateOfBirth">Date de naissance</label>
                        <input id="dateOfBirth" type="date" className="input-field" {...register('dateOfBirth')} />
                        {errors.dateOfBirth && <p className="mt-1 text-xs text-danger">{errors.dateOfBirth.message}</p>}
                    </div>
                    <button onClick={nextStep} className="btn-primary w-full py-3.5 mt-2">Suivant</button>
                </div>

                {/* STEP 2: Contact & Auth */}
                <div className={step === 2 ? 'block animate-fade-in space-y-4' : 'hidden'}>
                    <div>
                        <label className="input-label" htmlFor="email">Email</label>
                        <input id="email" type="email" className="input-field" placeholder="jean@exemple.com" {...register('email')} />
                        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="input-label" htmlFor="phone">Téléphone</label>
                        <input id="phone" type="tel" className="input-field" placeholder="+228..." {...register('phone')} />
                        {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
                    </div>
                    <div>
                        <label className="input-label" htmlFor="password">Mot de passe</label>
                        <input id="password" type="password" className="input-field" placeholder="••••••••" {...register('password')} />
                        {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                        <p className="text-xs text-gray-400 mt-1">Min. 8 caractères, dont une majuscule et un chiffre.</p>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={prevStep} className="btn-secondary flex-1 py-3.5">Retour</button>
                        <button onClick={nextStep} className="btn-primary flex-1 py-3.5">Suivant</button>
                    </div>
                </div>

                {/* STEP 3: Identification & Address */}
                <div className={step === 3 ? 'block animate-fade-in space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="input-label" htmlFor="nationalIdType">Type de pièce</label>
                            <select id="nationalIdType" className="input-field" {...register('nationalIdType')}>
                                <option value="CNI">CNI</option>
                                <option value="PASSPORT">Passeport</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="input-label" htmlFor="nationalIdNumber">Numéro de pièce</label>
                            <input id="nationalIdNumber" className="input-field" placeholder="N° de votre pièce" {...register('nationalIdNumber')} />
                            {errors.nationalIdNumber && <p className="mt-1 text-xs text-danger">{errors.nationalIdNumber.message}</p>}
                        </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-2">
                        <label className="input-label">Adresse postale</label>
                        <div className="space-y-3">
                            <input className="input-field" placeholder="Ex: 123 Rue de la Liberté" {...register('address.street')} />
                            {errors.address?.street && <p className="text-xs text-danger">{errors.address.street.message}</p>}

                            <div className="grid grid-cols-2 gap-3">
                                <input className="input-field" placeholder="Ville" {...register('address.city')} />
                                <input className="input-field" placeholder="Pays" {...register('address.country')} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-2 grid grid-cols-2 gap-3">
                        <div>
                            <label className="input-label" htmlFor="profession">Profession</label>
                            <input id="profession" className="input-field" placeholder="Employé..." {...register('profession')} />
                            {errors.profession && <p className="mt-1 text-xs text-danger">{errors.profession.message}</p>}
                        </div>
                        <div>
                            <label className="input-label" htmlFor="monthlyIncome">Revenus nets</label>
                            <input id="monthlyIncome" type="number" className="input-field" placeholder="0" {...register('monthlyIncome', { valueAsNumber: true })} />
                            {errors.monthlyIncome && <p className="mt-1 text-xs text-danger">{errors.monthlyIncome.message}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3.5">Retour</button>
                        <button type="submit" disabled={isLoading} className="btn-primary flex-[2] py-3.5">
                            {isLoading ? 'Création...' : 'Valider'}
                        </button>
                    </div>
                </div>
            </form>

            {!isSuccess && (
                <div className="mt-8 pt-6 border-t border-border text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        Déjà client ?{' '}
                        <Link href="/connexion" className="text-primary-500 font-bold hover:underline">
                            Se connecter
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
}
