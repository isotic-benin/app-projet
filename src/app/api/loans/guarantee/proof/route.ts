import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ObjectId } from 'mongodb';
import { saveFile } from '@/lib/file-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MIME_BY_EXT: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }
        const formData = await req.formData();
        const applicationId = String(formData.get('applicationId') || '');
        const file = formData.get('proof') as File | null;

        if (!applicationId) return NextResponse.json({ error: 'ID dossier requis' }, { status: 400 });
        if (!file || file.size === 0) return NextResponse.json({ error: 'Veuillez joindre votre preuve de virement (PDF ou image).' }, { status: 400 });
        if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 8 Mo).' }, { status: 400 });

        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) return NextResponse.json({ error: 'Format non autorisé. PDF, JPG, PNG ou WEBP uniquement.' }, { status: 400 });

        const db = await getDb();
        const userId = new ObjectId(session.user.id);
        const appId = new ObjectId(applicationId);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId, userId });
        if (!application) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });

        // Doit être contract_signed et invitation déjà envoyée
        if (application.status !== 'contract_signed') {
            return NextResponse.json({ error: 'Le versement de la garantie n’est pas encore ouvert pour ce dossier. Attendez l’invitation de notre équipe.' }, { status: 400 });
        }
        if (!application.guaranteeDeposit?.invitedAt) {
            return NextResponse.json({ error: 'L’invitation au versement n’a pas encore été envoyée par l’équipe.' }, { status: 400 });
        }
        if (application.guaranteeDeposit?.status === 'paid') {
            return NextResponse.json({ error: 'La garantie a déjà été validée pour ce dossier.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `garantie_${application.applicationNumber}_${Date.now()}.${ext}`;
        const key = `${session.user.id}/${fileName}`;
        await saveFile(key, buffer, MIME_BY_EXT[ext] || 'application/octet-stream', 'private');
        const url = `/api/fichier/${session.user.id}/${fileName}`;

        const now = new Date();
        // Transaction en attente de validation admin
        const guaranteeAmount = application.guaranteeDeposit?.required || Math.round((application.amount || 0) * 0.10);
        const txRes = await db.collection(COLLECTIONS.TRANSACTIONS).insertOne({
            userId,
            loanApplicationId: appId,
            type: 'guarantee_deposit',
            amount: guaranteeAmount,
            status: 'pending',
            method: 'bank_transfer',
            reference: url,
            proofUrl: url,
            fileName: file.name,
            proof: { fileUrl: url, uploadedAt: now },
            createdAt: now,
            updatedAt: now,
        });

        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    'guaranteeDeposit.status': 'submitted',
                    'guaranteeDeposit.proofUrl': url,
                    'guaranteeDeposit.proofFileName': file.name,
                    'guaranteeDeposit.submittedAt': now,
                    'guaranteeDeposit.transactionId': txRes.insertedId,
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'contract_signed',
                        changedAt: now,
                        changedBy: userId,
                        note: 'Preuve de virement garantie déposée par le client — en attente de validation.',
                    },
                } as any,
            }
        );

        await createNotification({
            userId,
            type: 'guarantee_proof_submitted',
            title: 'Preuve de garantie déposée',
            message: 'Votre preuve de virement a bien été reçue. Notre équipe la vérifiera sous 24h ouvrées.',
            link: `/mon-compte/prets/`,
        });

        // Notifier les admins via audit (pas de notification admin séparée pour l'instant)
        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: AUDIT_ACTIONS.GUARANTEE_DEPOSIT_SUBMITTED,
            targetType: 'loan_application',
            targetId: appId,
            metadata: { transactionId: txRes.insertedId, proofUrl: url },
        });

        return NextResponse.json({ success: true, proofUrl: url });
    } catch (e: any) {
        console.error('[GUARANTEE PROOF ERROR]', e);
        return NextResponse.json({ error: 'Erreur lors du dépôt de la preuve.' }, { status: 500 });
    }
}
