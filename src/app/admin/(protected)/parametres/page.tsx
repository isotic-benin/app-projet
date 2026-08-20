import { getDb, COLLECTIONS } from '@/lib/db';
import { Settings as SettingsIcon } from 'lucide-react';

export default async function ParametresPage() {
    const db = await getDb();

    const settings = await db.collection(COLLECTIONS.SETTINGS).find({}).toArray();

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-extrabold text-navy flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-primary-500" />
                    Configuration
                </h1>
                <p className="text-gray-500 mt-1">Gérez les paramètres globaux de la plateforme financière.</p>
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm p-8">
                <div className="space-y-6">
                    {settings.length === 0 ? (
                        <p className="text-gray-500">Aucun paramètre configuré en base de données.</p>
                    ) : (
                        settings.map(setting => (
                            <div key={setting._id.toString()} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                <div className="text-sm font-semibold text-navy uppercase tracking-wider mb-2">
                                    {setting.key.replace(/_/g, ' ')}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 font-mono text-primary-600 text-lg border border-border/50">
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

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2">
                <h3 className="text-amber-700 font-bold">Accès SuperAdmin uniquement</h3>
                <p className="text-amber-600/80 text-sm">Pour modifier ces paramètres, vous devez utiliser le protocole de déploiement en base de données ou demander l'intégration MVP du formulaire d'édition.</p>
            </div>
        </div>
    );
}
