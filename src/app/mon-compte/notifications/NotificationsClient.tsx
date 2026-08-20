'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellRing, CheckCheck, FileSignature, HandCoins, Banknote, XCircle, CheckCircle, Inbox } from 'lucide-react';

const TYPE_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
    loan_approved: { icon: FileSignature, color: 'text-green-600', bg: 'bg-green-50' },
    contract_sent: { icon: FileSignature, color: 'text-green-600', bg: 'bg-green-50' },
    guarantee_invite: { icon: HandCoins, color: 'text-amber-600', bg: 'bg-amber-50' },
    guarantee_paid: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    loan_disbursed: { icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    withdrawal_validated: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    withdrawal_rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function NotificationsClient({ notifications }: { notifications: any[] }) {
    const router = useRouter();
    const [isMarking, setIsMarking] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = async () => {
        setIsMarking(true);
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            router.refresh();
        } catch {
            setIsMarking(false);
        }
    };

    const markReadAndGo = async (n: any) => {
        if (!n.read) {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: n.id }),
            });
        }
        if (n.link) {
            router.push(n.link);
        } else {
            router.refresh();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy">Notifications</h1>
                    <p className="text-gray-500 mt-1">
                        {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Vous êtes à jour.'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        disabled={isMarking}
                        className="btn-secondary text-sm py-2.5 px-4 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Tout marquer comme lu
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="card shadow-sm text-center py-16">
                    <Inbox className="w-12 h-12 text-gray-300 mb-4 mx-auto" />
                    <h2 className="text-xl font-bold text-navy mb-2">Aucune notification</h2>
                    <p className="text-gray-500">Vous serez informé ici de l'avancement de vos demandes de crédit.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => {
                        const style = TYPE_STYLES[n.type] || { icon: Bell, color: 'text-primary-500', bg: 'bg-primary-50' };
                        const Icon = style.icon;
                        return (
                            <div
                                key={n.id}
                                onClick={() => markReadAndGo(n)}
                                className={`flex gap-4 items-start p-4 rounded-2xl border cursor-pointer transition-colors ${n.read
                                        ? 'bg-white border-border'
                                        : 'bg-primary-50/40 border-primary-200 shadow-sm'
                                    }`}
                            >
                                <div className={`w-11 h-11 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-5 h-5 ${style.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-bold text-navy text-sm ${n.read ? '' : ''}`}>{n.title}</p>
                                        {!n.read && <BellRing className="w-4 h-4 text-amber-500 shrink-0" />}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {new Date(n.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        {n.link && <span className="text-primary-500 font-medium"> · Voir {'->'}</span>}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}