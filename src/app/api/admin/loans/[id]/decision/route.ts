import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/db';
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { generateAndStoreLoanContract, computeGuaranteeAmount, CONTRACT_STUDY_FEE_CENTS } from '@/lib/loan-contract';
import { sendLoanContractPdfEmail } from '@/lib/mailer';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const r = (annualRate / 100) / 12;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

function generateAmortizationTable(principal: number, annualRate: number, months: number, startDate: Date) {
    const r = (annualRate / 100) / 12;
    const monthly = computeMonthlyPayment(principal, annualRate, months);
    let remaining = principal;

    const rules = [];

    for (let i = 1; i <= months; i++) {
        const interest = Math.round(remaining * r);
        const capitalPaid = monthly - interest;
        remaining = Math.max(0, remaining - capitalPaid);

        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        rules.push({
            number: i,
            dueDate,
            principalDue: capitalPaid,
            interestDue: interest,
            totalDue: monthly,
            amountPaid: 0,
            status: 'pending',
            paidAt: null,
            transactionIds: []
        });
    }
    return rules;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }

        const body = await req.json();
        const { decision, reason } = body;

        if (decision !== 'approve' && decision !== 'reject') {
            return NextResponse.json({ error: 'Décision invalide' }, { status: 400 });
        }

        const db = await getDb();
        const loanId = new ObjectId(params.id);

        const application = await db.collection(COLLECTIONS.LOAN_APPLICATIONS).findOne({ _id: loanId });
        if (!application) {
            return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        const decidableStatuses = ['submitted', 'under_review'];
        if (!decidableStatuses.includes(application.status)) {
            return NextResponse.json({ error: 'Ce dossier a déjà été traité.' }, { status: 400 });
        }

        let newStatus;
        let note;
        let auditAction;
        const adminId = new ObjectId(session.user.id);
        const now = new Date();

        if (decision === 'approve') {
            if (application.status === 'submitted') {
                newStatus = 'approved_pending_guarantee';
                const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                const guaranteeAmount = computeGuaranteeAmount(application.amount || 0);
                note = 'Dossier approuvé par l\'administration. Contrat de crédit généré et envoyé au client.';
                auditAction = AUDIT_ACTIONS.LOAN_APPLICATION_APPROVED;

                await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                    { _id: loanId },
                    {
                        $set: {
                            status: newStatus,
                            decision: 'approved',
                            decisionDate: now,
                            decisionNote: reason || '',
                            assignedAdmin: adminId,
                            'guaranteeDeposit.required': guaranteeAmount,
                            'guaranteeDeposit.deadline': deadline,
                            'guaranteeDeposit.status': 'pending',
                            updatedAt: now,
                        },
                        $push: {
                            statusHistory: {
                                status: newStatus,
                                changedAt: now,
                                changedBy: adminId,
                                note: note,
                            },
                        } as any,
                    }
                );

                await createNotification({
                    userId: application.userId,
                    type: NOTIFICATION_TYPES.LOAN_APPROVED,
                    title: 'Votre demande de crédit a été approuvée',
                    message: `Félicitations ! Votre prêt ${application.productName} a été approuvé. Un contrat PDF vous a été envoyé : téléchargez-le, signez-le puis déposez-le dans votre espace pour poursuivre.`,
                    link: `/mon-compte/prets/${loanId}/contrat`,
                });

                // ─── Génération automatique du contrat PDF + envoi au client ───
                try {
                    const client = await db.collection(COLLECTIONS.USERS).findOne({ _id: application.userId });
                    if (client?.email) {
                        const contract = await generateAndStoreLoanContract(
                            {
                                applicationNumber: application.applicationNumber,
                                productName: application.productName,
                                amount: application.amount,
                                duration: application.duration,
                                annualRate: application.annualRate,
                                guaranteeAmount,
                                studyFee: CONTRACT_STUDY_FEE_CENTS,
                                purpose: application.purpose,
                            },
                            {
                                firstName: client.firstName,
                                lastName: client.lastName,
                                clientNumber: client.clientNumber,
                                email: client.email,
                            },
                            application.userId.toString()
                        );

                        const mail = await sendLoanContractPdfEmail({
                            to: client.email,
                            user: { firstName: client.firstName, lastName: client.lastName, clientNumber: client.clientNumber || '' },
                            application: {
                                id: loanId,
                                applicationNumber: application.applicationNumber,
                                productName: application.productName,
                                amount: application.amount,
                                duration: application.duration,
                                annualRate: application.annualRate,
                                guaranteeAmount,
                                studyFee: CONTRACT_STUDY_FEE_CENTS,
                            },
                            pdfBuffer: contract.buffer,
                            pdfFileName: contract.fileName,
                            customMessage: reason || undefined,
                        });

                        await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                            { _id: loanId },
                            {
                                $set: {
                                    'contract.pdfUrl': contract.url,
                                    'contract.fileName': contract.fileName,
                                    'contract.sentAt': now,
                                    'contract.signed': false,
                                    'contract.signedUrl': null,
                                    'contract.signedAt': null,
                                },
                                $push: {
                                    emailThread: {
                                        subject: `Votre contrat de prêt ${application.productName} — Dossier ${application.applicationNumber}`,
                                        direction: 'outbound',
                                        sentAt: now,
                                        body: mail.success ? 'Contrat PDF envoyé avec succès au client.' : "Échec de l'envoi du contrat PDF.",
                                    },
                                } as any,
                            }
                        );
                    }
                } catch (contractErr) {
                    console.error('[CONTRACT GENERATION ERROR]', contractErr);
                }
            } else {
                newStatus = 'disbursed';
                note = 'Dossier approuvé avec succès. L\'utilisateur ayant déjà réglé la garantie de 10%, les fonds ont été automatiquement décaissés.';
                auditAction = AUDIT_ACTIONS.LOAN_APPLICATION_APPROVED;

                await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                    { _id: loanId },
                    {
                        $set: {
                            status: newStatus,
                            decision: 'approved',
                            decisionDate: now,
                            decisionNote: reason || '',
                            assignedAdmin: adminId,
                            updatedAt: now,
                        },
                        $push: {
                            statusHistory: {
                                status: newStatus,
                                changedAt: now,
                                changedBy: adminId,
                                note: note,
                            },
                        } as any,
                    }
                );

                // Créditer le portefeuille du client
                await db.collection(COLLECTIONS.USERS).updateOne(
                    { _id: application.userId },
                    { $inc: { accountBalance: application.amount }, $set: { updatedAt: now } }
                );

                // Generate repayment schedule (same logic as disburse route)
                const schedule = generateAmortizationTable(
                    application.amount,
                    application.annualRate,
                    application.duration,
                    now
                );

                const repaymentDoc = {
                    loanApplicationId: loanId,
                    userId: application.userId,
                    principal: application.amount,
                    annualRate: application.annualRate,
                    durationMonths: application.duration,
                    startDate: now,
                    installments: schedule,
                    createdAt: now,
                    updatedAt: now,
                };

                await db.collection('repaymentSchedules').insertOne(repaymentDoc);

                // Create disbursement transaction
                await db.collection('transactions').insertOne({
                    userId: application.userId,
                    loanApplicationId: loanId,
                    type: 'disbursement',
                    amount: application.amount,
                    status: 'completed',
                    method: 'automatic',
                    createdAt: now,
                });
            }
        } else {
            newStatus = 'rejected';
            note = `Dossier refusé. Raison : ${reason || 'Non spécifiée'}.${application.guaranteeDeposit?.status === 'paid' ? ' Remboursement de la garantie de 10% lancé.' : ''}`;
            auditAction = AUDIT_ACTIONS.LOAN_APPLICATION_REJECTED;

            await db.collection(COLLECTIONS.LOAN_APPLICATIONS).updateOne(
                { _id: loanId },
                {
                    $set: {
                        status: newStatus,
                        decision: 'rejected',
                        decisionDate: now,
                        decisionNote: reason || '',
                        assignedAdmin: adminId,
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: newStatus,
                            changedAt: now,
                            changedBy: adminId,
                            note: note,
                        },
                    } as any,
                }
            );
        }

        await writeAuditLog({
            actorType: 'admin',
            actorId: adminId,
            action: auditAction,
            targetType: 'loan_application',
            targetId: loanId,
            metadata: { decision, reason, previousStatus: application.status },
        });

        return NextResponse.json({ success: true, status: newStatus });

    } catch (err: any) {
        console.error('[ADMIN LOAN DECISION ERROR]', err);
        return NextResponse.json({ error: 'Erreur système' }, { status: 500 });
    }
}
