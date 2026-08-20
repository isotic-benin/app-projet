import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { sendLoanContractEmail } from '@/lib/mailer';
import { generateAndStoreLoanContract, computeGuaranteeAmount, CONTRACT_STUDY_FEE_CENTS } from '@/lib/loan-contract';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { subject, customMessage } = body;

        const db = await getDb();
        const appId = new ObjectId(params.id);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: appId });
        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: application.userId });
        if (!user) {
            return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
        }

        const amount = application.amount || 0;
        const guaranteeAmount = computeGuaranteeAmount(amount);

        // Ensure a deadline exists for the guarantee deposit
        let deadline: Date | null = application.guaranteeDeposit?.deadline
            ? new Date(application.guaranteeDeposit.deadline)
            : null;

        if (!deadline) {
            deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 jours
        }

        // Store the required guarantee + deadline on the application for later use
        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: {
                    'guaranteeDeposit.required': guaranteeAmount,
                    'guaranteeDeposit.deadline': deadline,
                    'guaranteeDeposit.status': 'pending',
                    updatedAt: new Date(),
                }
            }
        );

        // Generate + store the PDF contract, attach it to the email
        let contractAttachment: { filename: string; content: string } | undefined;
        let contractUrl: string | null = null;
        let contractFileName: string | null = null;
        try {
            const contract = await generateAndStoreLoanContract(
                {
                    applicationNumber: application.applicationNumber,
                    productName: application.productName,
                    amount,
                    duration: application.duration,
                    annualRate: application.annualRate,
                    guaranteeAmount,
                    studyFee: CONTRACT_STUDY_FEE_CENTS,
                    purpose: application.purpose,
                },
                {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    clientNumber: user.clientNumber,
                    email: user.email,
                },
                application.userId.toString()
            );
            contractAttachment = { filename: contract.fileName, content: contract.buffer.toString('base64') };
            contractUrl = contract.url;
            contractFileName = contract.fileName;
        } catch (pdfErr) {
            console.error('[SEND CONTRACT PDF GENERATION ERROR]', pdfErr);
        }

        const mailResult = await sendLoanContractEmail({
            to: user.email,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                clientNumber: user.clientNumber,
            },
            application: {
                id: appId,
                applicationNumber: application.applicationNumber,
                productName: application.productName,
                amount,
                duration: application.duration,
                annualRate: application.annualRate,
                guaranteeAmount,
                studyFee: CONTRACT_STUDY_FEE_CENTS,
                deadline,
            },
            subject: subject || undefined,
            customMessage: customMessage || undefined,
            attachments: contractAttachment ? [contractAttachment] : undefined,
        });

        if (!mailResult.success) {
            return NextResponse.json({ error: "L'email n'a pas pu être envoyé. Réessayez." }, { status: 500 });
        }

        const now = new Date();

        // Record contract on the application (keep previous sent contract if generation failed)
        const contractUpdate: Record<string, unknown> = {};
        if (contractUrl) {
            contractUpdate['contract.pdfUrl'] = contractUrl;
            contractUpdate['contract.fileName'] = contractFileName;
            contractUpdate['contract.sentAt'] = now;
            if (application.contract?.signed !== true) {
                contractUpdate['contract.signed'] = false;
            }
        }

        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
            { _id: appId },
            {
                $set: contractUpdate,
                $push: {
                    emailThread: {
                        direction: 'outbound',
                        subject: subject || `Contrat de prêt ${application.productName} — Dossier ${application.applicationNumber}`,
                        body: customMessage || 'Contrat de prêt envoyé au client (PDF joint).',
                        template: 'loan_contract',
                        sentBy: new ObjectId(session.user.id),
                        sentAt: now,
                    },
                } as any,
            }
        );

        await writeAuditLog({
            actorType: 'admin',
            actorId: new ObjectId(session.user.id),
            action: AUDIT_ACTIONS.LOAN_CONTRACT_SENT,
            targetType: 'loan_application',
            targetId: appId,
            metadata: { subject: subject || null, guaranteeAmount, studyFee: CONTRACT_STUDY_FEE_CENTS, deadline: deadline.toISOString(), pdf: contractUrl },
        });

        return NextResponse.json({ success: true, message: 'Contrat envoyé par email au client.' });
    } catch (err: any) {
        console.error('[SEND CONTRACT ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
