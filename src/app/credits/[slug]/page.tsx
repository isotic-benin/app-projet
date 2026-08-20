import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';
import { Briefcase, Car, Hammer, Zap } from 'lucide-react';

const LOAN_PRODUCTS = [
    { slug: 'pret-personnel', name: 'Prêt Personnel', min: 500, max: 500000, rate: 14.5, icon: <Briefcase className="w-10 h-10 text-white" />, color: 'bg-primary-500' },
    { slug: 'pret-auto', name: 'Prêt Auto', min: 500, max: 500000, rate: 13.5, icon: <Car className="w-10 h-10 text-white" />, color: 'bg-blue-500' },
    { slug: 'pret-travaux', name: 'Prêt Travaux', min: 500, max: 500000, rate: 15.0, icon: <Hammer className="w-10 h-10 text-white" />, color: 'bg-amber-500' },
    { slug: 'mini-pret', name: 'Mini Prêt Express', min: 500, max: 500000, rate: 18.0, icon: <Zap className="w-10 h-10 text-white" />, color: 'bg-green-500' },
];

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
    const product = LOAN_PRODUCTS.find(p => p.slug === params.slug);

    if (!product) {
        return (
            <main className="min-h-screen flex flex-col bg-surface">
                <PublicHeader />
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <h1 className="text-2xl font-bold text-navy">Produit non trouvé</h1>
                    <Link href="/credits" className="btn-secondary">Retour aux offres</Link>
                </div>
                <PublicFooter />
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col bg-surface font-sans">
            <PublicHeader />

            <section className="hero-gradient text-white py-16 md:py-24 shadow-inner">
                <div className="w-full px-4 md:px-12 text-center flex flex-col items-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-300">{product.name}</h1>
                    <p className="text-lg text-blue-100 max-w-xl mx-auto mb-8 leading-relaxed">
                        Financement rapide, transparent et sans frais cachés. Réponse de principe sous 48h.
                    </p>
                    <div className="flex gap-4 flex-wrap justify-center">
                        <div className="bg-white/20 px-6 py-3 rounded-xl font-mono text-lg font-bold backdrop-blur-sm border border-white/20">
                            Dès {product.rate}% / an
                        </div>
                        <div className="bg-white/20 px-6 py-3 rounded-xl font-mono text-lg font-bold backdrop-blur-sm border border-white/20">
                            Jusqu'à {product.max.toLocaleString('fr-FR')} €
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex-1 w-full px-4 md:px-12 py-16">
                <div className="w-full space-y-8 bg-white p-8 md:p-12 rounded-3xl border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-navy mb-4">Prêt à donner vie à votre projet ?</h2>
                    <p className="text-gray-500 leading-relaxed text-lg">
                        Altia Finance facilite votre démarche. Votre dossier est 100% digital, de la simulation jusqu'au versement de votre crédit.
                        L'inscription et le dépôt de votre demande sont gratuits, sans aucun paiement initial.
                        Après analyse, nos administrateurs vous envoient un contrat avec une retenue suspensive standard de 10% requise avant le décaissement total de votre <strong>{product.name.toLowerCase()}</strong>.
                    </p>

                    <div className="bg-surface p-8 rounded-2xl border border-border mt-12 text-center space-y-6">
                        <div className="w-16 h-16 bg-primary-100 text-primary-500 flex items-center justify-center rounded-full mx-auto mb-2 text-2xl">
                            ✓
                        </div>
                        <h3 className="text-xl font-bold text-navy">Passez à l'action</h3>
                        <p className="text-gray-500 px-4">Connectez-vous à votre espace client pour profiter de notre simulateur précis et valider techniquement votre demande.</p>
                        <Link href="/inscription" className="btn-primary w-full md:w-auto px-12 py-4 text-lg inline-block">
                            Simuler et Lancer mon {product.name}
                        </Link>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
