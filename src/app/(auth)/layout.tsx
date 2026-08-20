import Link from 'next/link';
import { ReactNode } from 'react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex">
                        <BrandLogo size="md" />
                    </Link>
                    <p className="mt-3 text-sm text-gray-500 font-medium">
                        Le crédit 100% en ligne, rapide et sécurisé.
                    </p>
                </div>

                {children}

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Altia Finance. Tous droits réservés.</p>
                    <p className="mt-1">
                        Connexion entièrement sécurisée par chiffrement de bout en bout.
                    </p>
                </div>
            </div>
        </div>
    );
}
