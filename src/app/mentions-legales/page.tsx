import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';

export default function MentionsLegalesPage() {
    return (
        <main className="min-h-screen flex flex-col bg-surface font-sans">
            <PublicHeader />

            <section className="hero-gradient text-white py-16 md:py-24 shadow-inner">
                <div className="w-full px-4 md:px-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-300">Mentions Légales</h1>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Transparence et conformité au cœur de notre service financier.
                    </p>
                    <div className="inline-flex mt-6 items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
                    </div>
                </div>
            </section>

            <section className="flex-1 w-full px-4 md:px-12 py-16">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border prose prose-navy lg:prose-lg max-w-none text-gray-700 w-full">
                    <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mt-0">1. Éditeur du site</h2>
                    <p className="mb-8">
                        Le site Altia Finance est édité par la société <strong>Altia Finance SARL</strong> (Entreprise fictive destinée à la démonstration de la plateforme logicielle).<br />
                        Capital social : 100 €<br />
                        Siège social : Cotonou, Bénin<br />
                        Contact : <a href="mailto:contact@altiafinance.com" className="text-primary-500 font-semibold hover:underline">contact@altiafinance.com</a>
                    </p>

                    <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mt-8">2. Hébergement</h2>
                    <p className="mb-8">
                        L'hébergement de ce site technique est opéré dans des data-centers sécurisés. Notre plateforme cloud garantit la pérennité architecturale des composants Next.js et de la base de données MongoDB.
                    </p>

                    <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mt-8">3. Régulation et Microfinance</h2>
                    <p className="mb-8">
                        Altia Finance simule un établissement opérant sous la régulation des systèmes décentralisés de finance (SDF). Conformément aux textes en vigueur, l'usure n'est pas pratiquée et nos taux respectent le taux effectif global (TAEG) légal.
                    </p>

                    <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mt-8">4. Propriété intellectuelle</h2>
                    <p className="mb-8">
                        L'ensemble des éléments figurant sur notre site, y compris les textes, logos, icônes et code <i>logiciel</i>, est protégé par les dispositions relatives au droit de la propriété intellectuelle. Toute reproduction est soumise à autorisation préalable.
                    </p>

                    <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mt-8">5. Avertissement</h2>
                    <div className="border-l-4 border-amber-500 pl-6 bg-amber-50/50 p-6 rounded-r-2xl mt-4">
                        <p className="font-semibold text-amber-900 m-0">
                            Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.
                        </p>
                        <p className="text-amber-800/80 text-sm mt-2">
                            En cas de non-respect de l'obligation de dépôt de garantie après approbation du crédit sous 14 jours, la demande est considérée comme nulle par décision préfectorale de la plateforme.
                        </p>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
