import { getDb, COLLECTIONS } from '@/lib/db';
import { Settings as SettingsIcon } from 'lucide-react';
import BankSettingsForm from './BankSettingsForm';

export default async function ParametresPage() {
    const db = await getDb();

    const settings = await db.collection(COLLECTIONS.SETTINGS).find({}).toArray();
    const map: Record<string, string> = {};
    settings.forEach((s: any) => (map[s.key] = String(s.value ?? '')));

    const bankInitial = {
        guarantee_bank_holder: map['guarantee_bank_holder'] || '',
        guarantee_bank_iban: map['guarantee_bank_iban'] || '',
        guarantee_bank_bic: map['guarantee_bank_bic'] || '',
        guarantee_bank_name: map['guarantee_bank_name'] || '',
        guarantee_bank_instructions: map['guarantee_bank_instructions'] || '',
    };

    const hasBank = !!(bankInitial.guarantee_bank_iban && bankInitial.guarantee_bank_holder);

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-extrabold text-navy flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-primary-500" />
                    Configuration
                </h1>
                <p className="text-gray-500 mt-1">Gérez les paramètres globaux de la plateforme financière.</p>
            </div>

            <BankSettingsForm initial={bankInitial} />

            {!hasBank && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <div className="text-red-600 font-bold">⚠️</div>
                    <p className="text-sm text-red-700">Aucun RIB configuré — l’envoi du mail de demande de garantie échouera. Renseignez les coordonnées ci-dessus.</p>
                </div>
            )}

            <div className="bg-white border border-border rounded-2xl shadow-sm p-8">
                <h2 className="font-bold text-navy mb-4">Paramètres généraux</h2>
                <div className="space-y-6">
                    {settings.length === 0 ? (
                        <p className="text-gray-500">Aucun paramètre configuré en base de données.</p>
                    ) : (
                        settings.map(setting => (
                            <div key={setting._id.toString()} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                <div className="text-sm font-semibold text-navy uppercase tracking-wider mb-2">
                                    {setting.key.replace(/_/g, ' ')}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 font-mono text-primary-600 text-lg border border-border/50 break-all">
                                    {String(setting.value)}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    Dernière modification : {new Date(setting.updatedAt).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
