'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, FileText, Menu, X, Bell } from 'lucide-react';
import LogoutButton from './LogoutButton';
import BrandLogo from '@/components/ui/BrandLogo';

export default function DashboardShell({ user, unreadCount, children }: { user: any, unreadCount?: number, children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const navLinks = [
        { href: '/mon-compte', icon: LayoutDashboard, label: 'Tableau de bord' },
        { href: '/mon-compte/prets', icon: CreditCard, label: 'Mes Prêts' },
        { href: '/mon-compte/kyc', icon: FileText, label: 'Documents (KYC)' },
    ];

    return (
        <div className="min-h-screen bg-surface flex flex-col font-sans">
            {/* Header - Fixed & Detached */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-white fixed top-0 w-full z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        className="md:hidden p-2 -ml-2 text-navy hover:bg-gray-100 rounded-lg"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <Link href="/mon-compte">
                        <BrandLogo size="sm" />
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/mon-compte/notifications"
                        className="relative w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {(unreadCount || 0) > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-sm font-bold text-navy">{user?.firstName} {user?.lastName}</span>
                        <span className="text-xs text-gray-500 font-mono tracking-tighter">{user?.clientNumber || 'Participant'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-500 font-bold uppercase cursor-pointer relative">
                        {user?.firstName?.charAt(0) || 'U'}
                        <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 pt-16">
                {/* Sidebar - Fixed Left, Blue Theme */}
                <aside
                    className={`fixed md:sticky top-16 left-0 bg-navy h-[calc(100vh-4rem)] w-64 border-r border-navy-700 flex flex-col z-40 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                        }`}
                >
                    <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
                        {navLinks.map(link => {
                            const isActive = pathname === link.href.split('?')[0];
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-primary-500 text-white shadow-sm'
                                            : 'text-gray-300 hover:bg-navy-600 hover:text-white'
                                        }`}
                                >
                                    <link.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout at the bottom */}
                    <div className="p-4 border-t border-navy-700/50 mt-auto bg-navy-900/20">
                        <LogoutButton theme="dark" />
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-30 md:hidden top-16"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-surface">
                    <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
                        {children}
                    </main>

                    {/* Footer Detached */}
                    <footer className="py-6 px-6 md:px-8 border-t border-border bg-white text-center text-sm text-gray-500 shrink-0">
                        <p>© {new Date().getFullYear()} Altia Finance. Tous droits réservés.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
