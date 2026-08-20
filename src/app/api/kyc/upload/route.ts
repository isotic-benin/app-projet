import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { put } from '@vercel/blob';

// Champs de documents acceptés (form-data)
const DOCUMENT_FIELDS = [
    'cni',                    // Pièce d'identité (obligatoire)
    'paySlip',                // Dernier bulletin de salaire (obligatoire)
    'address',                // Justificatif de domicile (obligatoire)
] as const;

const REQUIRED_FIELDS = ['cni', 'paySlip', 'address'] as const;

const MIME_BY_EXT: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
        }

        const formData = await req.formData();

        const files: Record<string, File> = {};
        for (const field of DOCUMENT_FIELDS) {
            const f = formData.get(field) as File | null;
            if (f && f.size > 0) files[field] = f;
        }

        const missing = REQUIRED_FIELDS.filter((f) => !files[f]);
        if (missing.length > 0) {
            return NextResponse.json({ error: 'Documents obligatoires manquants' }, { status: 400 });
        }

        const userId = session.user.id;

        const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

        const saveFile = async (file: File, type: string) => {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                throw new Error(`Extension .${ext} non autorisée`);
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `${type}_${Date.now()}.${ext}`;
            await put(`${userId}/${fileName}`, buffer, {
                access: 'private',
                contentType: MIME_BY_EXT[ext] || 'application/octet-stream',
                addRandomSuffix: false,
            });
            return `/api/fichier/${userId}/${fileName}`;
        };

        const documents: { type: string; url: string; uploadedAt: Date }[] = [];
        for (const [field, file] of Object.entries(files)) {
            const path = await saveFile(file, field);
            documents.push({ type: field, url: path, uploadedAt: new Date() });
        }

        const db = await getDb();
        const usersCol = db.collection(COLLECTIONS.USERS);

        await usersCol.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'kyc.status': 'pending',
                    'kyc.documents': documents,
                    updatedAt: new Date(),
                }
            }
        );

        // Write audit log
        await writeAuditLog({
            actorType: 'client',
            actorId: new ObjectId(userId),
            action: AUDIT_ACTIONS.KYC_SUBMITTED,
            targetType: 'user',
            targetId: new ObjectId(userId),
            metadata: { documents: documents.map((d) => d.type) },
        });

        return NextResponse.json({ success: true, message: 'Documents KYC soumis avec succès.' });
    } catch (err: any) {
        console.error('[UPLOAD KYC ERROR]', err);
        return NextResponse.json({ error: 'Erreur interne lors de la sauvegarde.' }, { status: 500 });
    }
}
