import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';
import HeroSimulator from '@/components/ui/HeroSimulator';
import PartnerCarousel from '@/components/ui/PartnerCarousel';
import { Briefcase, Car, Hammer, Zap } from 'lucide-react';
function StarIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

const LOAN_PRODUCTS = [
    {
        icon: <Briefcase className="w-10 h-10 text-primary-500" />,
        name: 'Prêt Personnel',
        slug: 'pret-personnel',
        description: 'Financez tous vos projets personnels : voyage, mariage, équipement.',
        rate: 'À partir de 14.5% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '6 à 60 mois',
    },
    {
        icon: <Car className="w-10 h-10 text-primary-500" />,
        name: 'Prêt Auto',
        slug: 'pret-auto',
        description: 'Achetez votre véhicule neuf ou d\'occasion, taux compétitifs.',
        rate: 'À partir de 13.5% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '12 à 84 mois',
    },
    {
        icon: <Hammer className="w-10 h-10 text-primary-500" />,
        name: 'Prêt Travaux',
        slug: 'pret-travaux',
        description: 'Rénovez ou agrandissez votre logement avec notre financement dédié.',
        rate: 'À partir de 15.0% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '12 à 72 mois',
    },
    {
        icon: <Zap className="w-10 h-10 text-primary-500" />,
        name: 'Mini Prêt Express',
        slug: 'mini-pret',
        description: 'Un coup de pouce rapide pour vos dépenses imprévues. Réponse en 48h.',
        rate: 'À partir de 18.0% / an',
        max: 'Jusqu\'à 500 000 €',
        duration: '1 à 12 mois',
    },
];

const STATS = [
    { value: '12 500+', label: 'Clients accompagnés' },
    { value: '4.7/5', label: 'Note moyenne', icon: <><StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon /></> },
    { value: '48h', label: 'Délai de réponse' },
    { value: '100%', label: 'En ligne, sans déplacement' },
];

const FAQ = [
    {
        q: 'Qui peut faire une demande de crédit ?',
        a: 'Toute personne majeure, résidente, avec un revenu régulier peut faire une demande. L\'inscription et le dépôt de votre demande de crédit sont gratuits, sans aucun paiement initial.',
    },
    {
        q: 'Comment sont calculées mes mensualités ?',
        a: 'Vos mensualités sont fixes tout au long de votre crédit. Utilisez notre simulateur pour voir instantanément le montant de vos mensualités.',
    },
    {
        q: 'Quel est le délai de déblocage des fonds ?',
        a: 'Après validation de votre dossier et du dépôt de garantie (10% du montant approuvé), les fonds sont débloqués sous 48-72h.',
    },
    {
        q: 'Que se passe-t-il si je ne peux pas payer une mensualité ?',
        a: 'Contactez-nous avant l\'échéance. Des solutions de report ou de rééchelonnement peuvent être étudiées selon votre situation.',
    },
];

export default function HomePage() {
    return (
        <main>
            <PublicHeader />

            {/* ─── HERO SECTION ─── */}
            <section className="hero-gradient text-white overflow-hidden">
                <div className="container-content py-16 md:py-24">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Left: copy */}
                        <div className="animate-fade-up">
                            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Réponse garantie en 48h
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                                Votre crédit,<br />
                                <span className="text-primary-300">simple et rapide</span>
                            </h1>
                            <p className="text-lg text-blue-100 mb-8 max-w-lg">
                                Prêt personnel, auto, travaux ou mini prêt — obtenez votre financement en quelques clics,
                                100% en ligne, sans déplacement.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link href="/inscription" className="btn-white">
                                    Simuler mon crédit
                                </Link>
                                <Link href="/credits" className="btn-secondary border-white text-white hover:bg-white/10">
                                    Découvrir nos offres
                                </Link>
                            </div>
                        </div>

                        <HeroSimulator />
                    </div>
                </div>
            </section>

            {/* ─── TRUST STATS BAR ─── */}
            <section className="bg-white border-b border-border">
                <div className="container-content py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {STATS.map((s) => (
                            <div key={s.label} className="text-center">
                                <div className="text-2xl font-extrabold text-navy">{s.value}</div>
                                {s.icon && <div className="flex justify-center text-amber-400 mt-1">{s.icon}</div>}
                                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── LOAN PRODUCTS ─── */}
            <section className="section-padding bg-surface">
                <div className="container-content">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-navy mb-3">Nos solutions de crédit</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">
                            Des offres adaptées à chaque besoin, avec des mensualités fixes et des taux compétitifs.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {LOAN_PRODUCTS.map((product) => (
                            <div key={product.slug} className="card-hover flex flex-col">
                                <div className="mb-4">{product.icon}</div>
                                <h3 className="text-lg font-bold text-navy mb-2">{product.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 flex-1">{product.description}</p>
                                <div className="space-y-1 mb-5">
                                    <div className="text-xs font-semibold text-primary-500">{product.rate}</div>
                                    <div className="text-xs text-gray-500">{product.max}</div>
                                    <div className="text-xs text-gray-500">{product.duration}</div>
                                </div>
                                <Link href={`/credits/${product.slug}`} className="btn-secondary text-sm py-2.5">
                                    En savoir plus
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="section-padding bg-white">
                <div className="container-content">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-navy mb-3">Comment ça marche ?</h2>
                        <p className="text-gray-500">Un processus simple, transparent et 100% en ligne.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en 5 minutes. Vérification de votre identité (KYC) pour votre sécurité.' },
                            { step: '02', title: 'Complétez votre KYC', desc: 'Vérification de votre identité et de vos revenus (KYC) entièrement en ligne et sans frais.' },
                            { step: '03', title: 'Faites votre demande', desc: 'Sélectionnez votre produit, renseignez votre situation et uploadez vos justificatifs.' },
                            { step: '04', title: 'Recevez vos fonds', desc: 'Après validation et dépôt de garantie (10%), vos fonds sont débloqués sous 48h.' },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-12 h-12 rounded-full bg-primary-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                                    {item.step}
                                </div>
                                <h3 className="font-bold text-navy mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className="section-padding bg-surface">
                <div className="container-content max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-navy mb-3">Questions fréquentes</h2>
                    </div>

                    <div className="space-y-4">
                        {FAQ.map((item, i) => (
                            <details key={i} className="card group cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-navy list-none">
                                    {item.q}
                                    <span className="ml-4 text-primary-500 transition-transform group-open:rotate-45 flex-shrink-0 text-xl">+</span>
                                </summary>
                                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── PARTNER BANNER ─── */}
            <PartnerCarousel />

            {/* ─── CTA BANNER ─── */}
            <section className="hero-gradient py-16">
                <div className="container-content text-center text-white">
                    <h2 className="text-3xl font-extrabold mb-4 text-primary-300">Prêt à commencer ?</h2>
                    <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                        Rejoignez des milliers de clients qui ont fait confiance à Altia Finance pour financer leurs projets.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link href="/inscription" className="btn-white text-base px-8 py-4">
                            Créer mon compte gratuit
                        </Link>
                        <Link href="/credits" className="btn-secondary border-white text-white hover:bg-white/10 text-base px-8 py-4">
                            Voir tous nos crédits
                        </Link>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
