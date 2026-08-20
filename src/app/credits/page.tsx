import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';
import { Briefcase, Car, Hammer, Zap } from 'lucide-react';

const LOAN_PRODUCTS = [
    {
        icon: <Briefcase className="w-12 h-12 text-primary-500" />,
        name: 'Prêt Personnel',
        slug: 'pret-personnel',
        description: 'Financez tous vos projets personnels : voyage, mariage, équipement.',
        rate: 'À partir de 14.5% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '6 à 60 mois',
    },
    {
        icon: <Car className="w-12 h-12 text-primary-500" />,
        name: 'Prêt Auto',
        slug: 'pret-auto',
        description: 'Achetez votre véhicule neuf ou d\'occasion, taux compétitifs.',
        rate: 'À partir de 13.5% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '12 à 84 mois',
    },
    {
        icon: <Hammer className="w-12 h-12 text-primary-500" />,
        name: 'Prêt Travaux',
        slug: 'pret-travaux',
        description: 'Rénovez ou agrandissez votre logement avec notre financement dédié.',
        rate: 'À partir de 15.0% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '12 à 72 mois',
    },
    {
        icon: <Zap className="w-12 h-12 text-primary-500" />,
        name: 'Mini Prêt Express',
        slug: 'mini-pret',
        description: 'Un coup de pouce rapide pour vos dépenses imprévues. Réponse en 48h.',
        rate: 'À partir de 18.0% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '1 à 12 mois',
    },
];

export default function CreditsPage() {
    return (
        <main className="min-h-screen flex flex-col bg-surface font-sans">
            <PublicHeader />

            <section className="hero-gradient text-white py-16 md:py-24 shadow-inner">
                <div className="w-full px-4 md:px-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-300">Notre catalogue de crédits</h1>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Découvrez nos offres claires, adaptées à vos besoins, avec des taux transparents et des conditions flexibles. Vous simulez, vous décidez.
                    </p>
                </div>
            </section>

            <section className="flex-1 w-full px-4 md:px-12 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {LOAN_PRODUCTS.map((product) => (
                        <div key={product.slug} className="card-hover flex flex-col p-8 border border-border shadow-sm bg-white rounded-3xl">
                            <div className="mb-6">{product.icon}</div>
                            <h2 className="text-2xl font-bold text-navy mb-3">{product.name}</h2>
                            <p className="text-base text-gray-500 mb-6 flex-1">{product.description}</p>

                            <div className="bg-surface rounded-xl p-5 space-y-3 mb-8">
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-gray-500">Taux Annuel</span>
                                    <span className="font-bold text-primary-500">{product.rate}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-gray-500">Montant Max</span>
                                    <span className="font-bold text-navy">{product.max}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Durée</span>
                                    <span className="font-bold text-navy">{product.duration}</span>
                                </div>
                            </div>

                            <Link href={`/credits/${product.slug}`} className="btn-primary w-full text-center py-4">
                                Découvrir et Simuler
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
