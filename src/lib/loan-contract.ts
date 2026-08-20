import { put } from '@vercel/blob';
import { generateLoanContractPdf } from './contract-pdf';

export interface ContractUserInfo {
    firstName: string;
    lastName: string;
    clientNumber?: string;
    email?: string;
}

export interface ContractApplicationInfo {
    applicationNumber: string;
    productName: string;
    amount: number; // centimes
    duration: number;
    annualRate: number;
    guaranteeAmount: number; // centimes
    studyFee: number; // centimes
    purpose?: string;
}

export interface StoredContract {
    buffer: Buffer;
    fileName: string;
    url: string;
}

function safeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Génère le PDF du contrat de prêt et le stocke dans Vercel Blob (privé).
 */
export async function generateAndStoreLoanContract(
    application: ContractApplicationInfo,
    user: ContractUserInfo,
    userId: string
): Promise<StoredContract> {
    const buffer = await generateLoanContractPdf({
        applicationNumber: application.applicationNumber,
        productName: application.productName,
        amount: application.amount,
        duration: application.duration,
        annualRate: application.annualRate,
        guaranteeAmount: application.guaranteeAmount,
        studyFee: application.studyFee,
        firstName: user.firstName,
        lastName: user.lastName,
        clientNumber: user.clientNumber,
        email: user.email,
        purpose: application.purpose,
    });

    const fileName = `contract_${safeFileName(application.applicationNumber)}_${Date.now()}.pdf`;

    await put(`${userId}/${fileName}`, buffer, {
        access: 'private',
        contentType: 'application/pdf',
        addRandomSuffix: false,
    });

    return {
        buffer,
        fileName,
        url: `/api/fichier/${userId}/${fileName}`,
    };
}

export function computeGuaranteeAmount(amountCents: number): number {
    return Math.round(amountCents * 0.1);
}

export const CONTRACT_STUDY_FEE_CENTS = 5000; // 50 € en centimes