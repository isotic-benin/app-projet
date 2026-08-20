'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function LogoutButton({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
    const baseClasses = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left";
    const themeClasses = theme === 'dark'
        ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
        : "text-danger hover:bg-danger/10";

    return (
        <button
            onClick={() => signOut({ callbackUrl: '/connexion', redirect: true })}
            className={`${baseClasses} ${themeClasses}`}
        >
            <LogOut className="w-5 h-5 text-current" />
            Se déconnecter
        </button>
    );
}
