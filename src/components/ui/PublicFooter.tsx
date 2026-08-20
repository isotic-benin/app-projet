import Link from 'next/link';
import BrandLogo from './BrandLogo';

export default function PublicFooter() {
    return (
        <footer className="bg-navy text-white w-full">
            <div className="container-content py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="mb-4">
                            <BrandLogo variant="light" />
                        </div>
                        <p className="text-sm text-blue-200">
                            Votre partenaire de microfinance en ligne. Solutions de crédit rapide, sécurisée et transparente.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-blue-300">Solutions</h4>
                        <ul className="space-y-2 text-sm text-blue-200">
                            <li><Link href="/credits/pret-personnel" className="hover:text-white transition-colors">Prêt Personnel</Link></li>
                            <li><Link href="/credits/pret-auto" className="hover:text-white transition-colors">Prêt Auto</Link></li>
                            <li><Link href="/credits/pret-travaux" className="hover:text-white transition-colors">Prêt Travaux</Link></li>
                            <li><Link href="/credits/mini-pret" className="hover:text-white transition-colors">Mini Prêt</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-blue-300">À propos</h4>
                        <ul className="space-y-2 text-sm text-blue-200">
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
                            <li><Link href="/politique-confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-blue-300">Espace client</h4>
                        <ul className="space-y-2 text-sm text-blue-200">
                            <li><Link href="/connexion" className="hover:text-white transition-colors">Se connecter</Link></li>
                            <li><Link href="/inscription" className="hover:text-white transition-colors">Créer un compte</Link></li>
                            <li><Link href="/mon-compte" className="hover:text-white transition-colors">Mon compte</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 text-center text-xs text-blue-300">
                    <p>© {new Date().getFullYear()} Altia Finance. Tous droits réservés.</p>
                    <p className="mt-2">
                        Le crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.
                    </p>
                </div>
            </div>
        </footer>
    );
}
