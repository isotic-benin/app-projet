'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Pen } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function PublicHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
            <div className="container-content flex items-center justify-between h-16">
                <Link href="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
                    <BrandLogo size="sm" />
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    <Link href="/credits" className="nav-link">Nos crédits</Link>
                    <Link href="/credits/pret-personnel" className="nav-link">Prêt personnel</Link>
                    <Link href="/credits/mini-pret" className="nav-link">Mini Prêt</Link>
                    <Link href="/contact" className="nav-link">Contact</Link>
                </div>

                <div className="flex items-center gap-1 md:gap-3">
                    <Link href="/connexion" className="btn-ghost text-sm hidden md:flex">
                        Espace client
                    </Link>
                    <Link
                        href="/inscription"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors md:w-auto md:px-5 md:py-2.5 md:gap-2 md:font-semibold md:text-sm"
                    >
                        <Pen className="w-4 h-4" />
                        <span className="hidden md:inline">Faire une demande</span>
                    </Link>
                    <button
                        className="md:hidden p-2 text-navy hover:text-primary-500 transition-colors"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu"
                    >
                        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="md:hidden border-t border-border bg-white">
                    <div className="container-content flex flex-col gap-1 py-4">
                        <Link href="/credits" className="nav-link block px-3 py-2.5 rounded-lg hover:bg-surface" onClick={() => setMenuOpen(false)}>Nos crédits</Link>
                        <Link href="/credits/pret-personnel" className="nav-link block px-3 py-2.5 rounded-lg hover:bg-surface" onClick={() => setMenuOpen(false)}>Prêt personnel</Link>
                        <Link href="/credits/mini-pret" className="nav-link block px-3 py-2.5 rounded-lg hover:bg-surface" onClick={() => setMenuOpen(false)}>Mini Prêt</Link>
                        <Link href="/contact" className="nav-link block px-3 py-2.5 rounded-lg hover:bg-surface" onClick={() => setMenuOpen(false)}>Contact</Link>
                        <Link href="/connexion" className="nav-link block px-3 py-2.5 rounded-lg hover:bg-surface" onClick={() => setMenuOpen(false)}>Espace client</Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
