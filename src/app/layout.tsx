import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'Altia Finance — Votre crédit en ligne rapide et sécurisé',
        template: '%s | Altia Finance',
    },
    description:
        'Obtenez votre prêt personnel, auto ou travaux en quelques clics. Réponse rapide, taux compétitifs, 100% en ligne.',
    keywords: ['crédit', 'prêt personnel', 'microfinance', 'prêt auto', 'prêt travaux', 'altia finance'],
    openGraph: {
        type: 'website',
        locale: 'fr_FR',
        siteName: 'Altia Finance',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
