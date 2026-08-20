import { z } from 'zod';

// ────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Numéro de téléphone invalide');
const emailSchema = z.string().email('Email invalide');
const passwordSchema = z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre');

// ────────────────────────────────────────────────
// User schemas
// ────────────────────────────────────────────────
export const registerUserSchema = z.object({
    firstName: z.string().min(2, 'Prénom requis').max(50),
    lastName: z.string().min(2, 'Nom requis').max(50),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
        .refine((d) => {
            const dob = new Date(d);
            const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            return age >= 18;
        }, 'Vous devez avoir au moins 18 ans'),
    nationalIdType: z.enum(['CNI', 'PASSPORT', 'AUTRE']),
    nationalIdNumber: z.string().min(3, 'Numéro de pièce requis').max(30),
    profession: z.string().min(2, 'Profession requise').max(100),
    address: z.object({
        street: z.string().min(3, 'Adresse requise'),
        city: z.string().min(2, 'Ville requise'),
        country: z.string().min(2, 'Pays requis'),
    }),
    monthlyIncome: z.number().positive('Revenu doit être positif').optional(),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Mot de passe requis'),
});

// ────────────────────────────────────────────────
// Loan product schemas
// ────────────────────────────────────────────────
export const loanProductSchema = z.object({
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    name: z.string().min(3).max(100),
    category: z.enum(['personnel', 'auto', 'travaux', 'mini_pret', 'renouvelable', 'autre']),
    description: z.string().min(10).max(1000),
    minAmount: z.number().int().positive().min(100),
    maxAmount: z.number().int().positive(),
    minDurationMonths: z.number().int().positive(),
    maxDurationMonths: z.number().int().positive().max(120),
    annualInterestRate: z.number().positive().max(100),
    taeg: z.number().positive().max(100),
    requiredDocuments: z.array(z.string()).min(1),
    active: z.boolean().default(true),
}).refine((d) => d.maxAmount >= d.minAmount, 'maxAmount doit être ≥ minAmount')
    .refine((d) => d.maxDurationMonths >= d.minDurationMonths, 'maxDuration doit être ≥ minDuration');

// ────────────────────────────────────────────────
// Loan simulation
// ────────────────────────────────────────────────
export const loanSimulationSchema = z.object({
    productId: objectIdSchema,
    amount: z.number().int().positive(),
    durationMonths: z.number().int().positive().max(120),
});

// ────────────────────────────────────────────────
// Loan application
// ────────────────────────────────────────────────
export const loanApplicationStep1Schema = z.object({
    productId: objectIdSchema,
    amountRequested: z.number().int().positive(),
    durationMonthsRequested: z.number().int().positive().max(120),
    purpose: z.string().min(10, 'Décrivez l\'objet du prêt').max(500),
});

export const loanApplicationStep2Schema = z.object({
    employmentStatus: z.string().min(2, 'Situation professionnelle requise'),
    employer: z.string().max(100).optional(),
    monthlyIncome: z.number().positive('Revenu requis'),
    monthlyExpenses: z.number().min(0).optional(),
});

// ────────────────────────────────────────────────
// Transaction / deposit proofs
// ────────────────────────────────────────────────
export const depositProofSchema = z.object({
    amount: z.number().positive('Montant requis'),
    method: z.enum(['bank_transfer', 'mobile_money', 'cash_agency', 'card']),
});

// ────────────────────────────────────────────────
// Admin actions
// ────────────────────────────────────────────────
export const loanDecisionApproveSchema = z.object({
    approvedAmount: z.number().int().positive(),
    approvedDurationMonths: z.number().int().positive().max(120),
    approvedRate: z.number().positive().max(100),
    notes: z.string().max(1000).optional(),
    emailBody: z.string().min(10, 'L\'email de notification est requis'),
});

export const loanDecisionRejectSchema = z.object({
    reason: z.string().min(10, 'Motif de rejet requis').max(500),
    emailBody: z.string().min(10, 'L\'email de notification est requis'),
});

export const kycDecisionSchema = z.object({
    decision: z.enum(['approve', 'reject']),
    rejectionReason: z.string().max(500).optional(),
});

export const adminLoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1),
});

// ────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────
export const settingsUpdateSchema = z.object({
    key: z.enum([
        'initial_deposit_amount',
        'guarantee_deposit_percentage',
        'guarantee_deposit_deadline_days',
        'currency',
    ]),
    value: z.union([z.string(), z.number(), z.boolean()]),
});
