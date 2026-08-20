import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen flex flex-col bg-surface font-sans">
            <PublicHeader />

            <section className="hero-gradient text-white py-16 md:py-24 shadow-inner">
                <div className="w-full px-4 md:px-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-300">Politique de Confidentialité & Sécurité</h1>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Le respect de vos données personnelles est notre absolue priorité.
                    </p>
                </div>
            </section>

            <section className="flex-1 w-full px-4 md:px-12 py-16">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border text-gray-700 leading-relaxed text-lg space-y-8 w-full">

                    <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 text-primary-900 font-medium">
                        La protection de vos données personnelles et bancaires est au cœur du modèle technologique de Altia Finance. Notre plateforme met en œuvre des standards d'ingénierie avancés pour sécuriser tous les aspects de vos opérations de microfinance.
                    </div>

                    <div>
                        <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mb-4">1. Chiffrement avancé des données sensibles</h2>
                        <p>
                            Afin de protéger vos Données Personnelles (PII) telles que vos numéros d'identification nationaux et adresses, notre système emploie le protocole cryptographique <strong className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded font-mono text-sm">AES-256-GCM</strong>.
                            Vos données sont chiffrées "au repos" dans notre base de données. Seuls les micro-services habilités possèdent la clé de déchiffrement lors du processus technico-financier d'évaluation.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mb-4">2. Traitement des pièces KYC (Know Your Customer)</h2>
                        <p>
                            Vos documents justificatifs (CNI, Bulletins de salaire) sont téléversés via des protocoles chiffrés point à point (TLS 1.3). Les fichiers binaires ne sont jamais injectés directement dans la base de données brute et ne peuvent être accédés qu'au travers d'URLs signées à durée de vie très courte, strictement réservées aux administrateurs.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mb-4">3. Accessibilité et Rôles (RBAC)</h2>
                        <p>
                            Notre système d'authentification sépare rigoureusement les sessions de nos clients de celles des administrateurs internes. Les administrateurs de haut niveau opèrent sous l'exigence d'une <strong>Authentification à Deux Facteurs (2FA TOTP)</strong> lors de leur accès au module d'évaluation budgétaire ou au décaissement final.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mb-4">4. Journalisation inaltérable (Audit Log)</h2>
                        <p>
                            Qu'il s'agisse de la soumission de votre dossier, du versement de votre capital de couverture ou de l'évaluation par l'agent de crédit, Altia Finance inscrit de manière permanente l'empreinte de cette action au sein de son module <strong>Audit Log Immutable (Inaltérable)</strong>.
                            Cette traçabilité logicielle absolue sert de fondement contre toute tentative de falsification de transaction.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-navy font-bold text-2xl border-b border-border pb-2 mb-4">5. Consentement et Droits</h2>
                        <p>
                            Sachez toutefois qu'aussitôt qu'une opération pécuniaire formelle (Crédit décaissé non soldé) est active, le Code Monétaire et Financier nous contraint à la conservation stricte d'une base technique certifiant l'historique de votre dossier complet et ce, jusqu'au remboursement effectif et total de vos engagements (échéanciers). En dehors de ce cadre, vous disposez d'un droit d'accès et d'effacement simple.
                        </p>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
