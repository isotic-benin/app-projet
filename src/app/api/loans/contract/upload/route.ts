import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { put } from '@vercel/blob';

const ALLOWED_EXTENSIONS = ['pdf'];

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
        }

        const formData = await req.formData();
        const applicationId = String(formData.get('applicationId') || '');
        const file = formData.get('signedContract') as File | null;

        if (!applicationId) {
            return NextResponse.json({ error: 'Identifiant du dossier requis' }, { status: 400 });
        }

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'Veuillez joindre votre contrat signé (PDF)' }, { status: 400 });
        }

        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: 'Le fichier doit être au format PDF' }, { status: 400 });
        }

        const db = await getDb();
        const userId = new ObjectId(session.user.id);
        const appId = new ObjectId(applicationId);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({
            _id: appId,
            userId,
        });

        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        const allowedStatuses = ['approved_pending_guarantee', 'contract_signed'];
        if (!allowedStatuses.includes(application.status)) {
            return NextResponse.json({ error: "Ce dossier ne peut pas recevoir de contrat signé à ce stade." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `signed_contract_${application.applicationNumber}_${Date.now()}.pdf`;
        await put(`${session.user.id}/${fileName}`, buffer, {
            access: 'private',
            contentType: 'application/pdf',
            addRandomSuffix: false,
        });
        const url = `/api/fichier/${session.user.id}/${fileName}`;

        const now = new Date();
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    status: 'contract_signed',
                    'contract.signed': true,
                    'contract.signedUrl': url,
                    'contract.signedFileName': fileName,
                    'contract.signedAt': now,
                    updatedAt: now,
                },
                $push: {
                    statusHistory: {
                        status: 'contract_signed',
                        changedAt: now,
                        changedBy: userId,
                        note: 'Contrat signé déposé par le client et en attente de validation.',
                    },
                } as any,
            }
        );

        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: 'loan_application.contract_signed',
            targetType: 'loan_application',
            targetId: appId,
            metadata: { signedUrl: url },
        });

        return NextResponse.json({ success: true, message: 'Contrat signé déposé avec succès. Notre équipe va procéder au déblocage de vos fonds.' });
    } catch (err: any) {
        console.error('[CONTRACT UPLOAD ERROR]', err);
        return NextResponse.json({ error: 'Erreur interne lors de la sauvegarde.' }, { status: 500 });
    }
}