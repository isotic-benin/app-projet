import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { productId, amount, duration, purpose } = body;

        if (!productId || !amount || !duration || !purpose) {
            return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
        }
        if (amount < 500 || amount > 500000) {
            return NextResponse.json({ error: 'Montant hors limites autorisées (500 € à 500 000 €)' }, { status: 400 });
        }
        if (duration < 1 || duration > 84) {
            return NextResponse.json({ error: 'Durée hors limites autorisées' }, { status: 400 });
        }

        const userId = new ObjectId(session.user.id);
        const db = await getDb();

        const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
        if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

        if (user.kyc?.status !== 'verified') {
            return NextResponse.json({ error: 'Votre identité doit être vérifiée (KYC) avant de pouvoir demander un crédit.' }, { status: 400 });
        }

        const existingApplication = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({
            userId,
            status: { $in: ['draft', 'submitted', 'under_review', 'decision_pending', 'approved_pending_guarantee', 'guarantee_paid'] },
        });
        if (existingApplication) {
            return NextResponse.json({ error: 'Vous avez déjà une demande de crédit active. Veuillez attendre la conclusion de votre dossier existant.' }, { status: 400 });
        }

        const product = await db.collection(COLLECTIONS.LOAN_PRODUCTS).findOne({ slug: String(productId) });

        const appNum = `CRD-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 1000}`;

        const amountCents = amount * 100;

        const status = 'submitted';
        const statusNote = 'Demande soumise. En attente de décision administrative.';

        const applicationDoc = {
            applicationNumber: appNum,
            userId,
            productId: product?._id || null,
            productName: product?.name || productId,
            amount: amountCents,
            duration,
            annualRate: product?.interestRate || 14.5,
            purpose,
            status,
            guaranteeDeposit: {
                required: 0,
                paid: 0,
                status: 'not_required',
                deadline: null,
            },
            statusHistory: [
                { status, changedAt: new Date(), changedBy: userId, note: statusNote },
            ],
            assignedAdmin: null,
            decision: null,
            decisionDate: null,
            decisionNote: null,
            emailThread: [],
            disbursement: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).insertOne(applicationDoc);

        await writeAuditLog({
            actorType: 'client',
            actorId: userId,
            action: AUDIT_ACTIONS.LOAN_APPLICATION_SUBMITTED,
            targetType: 'loan_application',
            targetId: result.insertedId,
            metadata: { productId, amount, duration, applicationNumber: appNum },
        });

        return NextResponse.json({
            success: true,
            applicationId: result.insertedId.toString(),
            applicationNumber: appNum,
        }, { status: 201 });

    } catch (err: any) {
        console.error('[LOAN APPLY ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
