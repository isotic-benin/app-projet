'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function AdminLogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/admin/login', redirect: true })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all w-full text-left"
        >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-current" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Se déconnecter</p>
                <p className="text-xs text-red-400/70">Fermer la session</p>
            </div>
        </button>
    );
}
