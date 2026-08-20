import Link from 'next/link';
import PublicHeader from '@/components/ui/PublicHeader';
import PublicFooter from '@/components/ui/PublicFooter';
import { Building2, Mail, Phone, Clock } from 'lucide-react';

export default function ContactPage() {
    return (
        <main className="min-h-screen flex flex-col bg-surface font-sans">
            <PublicHeader />

            <section className="hero-gradient text-white py-16 md:py-24 shadow-inner">
                <div className="w-full px-4 md:px-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-300">Contactez-nous</h1>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Notre équipe est à votre écoute pour répondre à toutes vos questions.
                    </p>
                </div>
            </section>

            <section className="flex-1 w-full px-4 md:px-12 py-16">
                <div className="grid md:grid-cols-2 gap-12 w-full">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-primary-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-navy">Notre adresse</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-lg font-semibold text-navy">BNP Paribas</p>
                            <p className="text-gray-600 leading-relaxed">
                                16 Boulevard des Italiens<br />
                                75009 Paris<br />
                                France
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-navy">Horaires d'ouverture</p>
                                    <p className="text-sm text-gray-500">Lun - Ven : 9h00 - 18h00</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-primary-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-navy">Nous écrire</h2>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Pour toute question relative à votre dossier, vous pouvez nous contacter par email. Notre équipe s'engage à vous répondre sous 48h.
                        </p>
                        <a href="mailto:contact@altiafinance.com" className="inline-flex items-center gap-2 text-primary-500 font-semibold hover:text-primary-600 transition-colors">
                            <Mail className="w-4 h-4" />
                            contact@altiafinance.com
                        </a>
                        <div className="mt-8 pt-6 border-t border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-navy">Téléphone</p>
                                    <a href="tel:+33123456789" className="text-primary-500 hover:text-primary-600 transition-colors">+33 1 23 45 67 89</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
