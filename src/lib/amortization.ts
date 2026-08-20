/**
 * Loan amortization calculator — French method (constant monthly payment)
 * All amounts in minor units (centimes / CFA fractions) to avoid float errors.
 */

export interface Installment {
    number: number;
    dueDate: Date;
    principalDue: number;    // minor units
    interestDue: number;     // minor units
    totalDue: number;        // minor units
    amountPaid: number;
    status: 'pending' | 'paid' | 'partial' | 'late';
    paidAt: null;
    transactionIds: [];
}

export interface AmortizationSchedule {
    principal: number;
    annualRate: number;
    durationMonths: number;
    startDate: Date;
    monthlyPayment: number;
    totalInterest: number;
    totalAmount: number;
    installments: Installment[];
}

/**
 * Calculate monthly payment using the standard formula:
 * M = P * r * (1+r)^n / ((1+r)^n - 1)
 * where r = annual_rate / 12 / 100
 */
export function calculateMonthlyPayment(
    principalMinorUnits: number,
    annualRatePercent: number,
    durationMonths: number
): number {
    if (annualRatePercent === 0) {
        return Math.round(principalMinorUnits / durationMonths);
    }

    const r = annualRatePercent / 12 / 100;
    const n = durationMonths;
    const factor = Math.pow(1 + r, n);
    const monthly = (principalMinorUnits * r * factor) / (factor - 1);
    return Math.round(monthly);
}

/**
 * Generate full amortization schedule.
 * @param principal - loan amount in minor units (centimes)
 * @param annualRatePercent - annual interest rate (e.g. 5.9 for 5.9%)
 * @param durationMonths - loan duration in months
 * @param startDate - first installment date (typically 1 month after disbursement)
 */
export function generateAmortizationSchedule(
    principal: number,
    annualRatePercent: number,
    durationMonths: number,
    startDate: Date
): AmortizationSchedule {
    const monthlyPayment = calculateMonthlyPayment(principal, annualRatePercent, durationMonths);
    const r = annualRatePercent / 12 / 100;

    const installments: Installment[] = [];
    let remainingPrincipal = principal;
    let totalInterest = 0;

    for (let i = 1; i <= durationMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);

        const interestDue = Math.round(remainingPrincipal * r);
        let principalDue: number;

        if (i === durationMonths) {
            // Last installment: pay remaining principal (handles rounding)
            principalDue = remainingPrincipal;
        } else {
            principalDue = monthlyPayment - interestDue;
        }

        const totalDue = principalDue + interestDue;
        totalInterest += interestDue;
        remainingPrincipal -= principalDue;

        installments.push({
            number: i,
            dueDate,
            principalDue,
            interestDue,
            totalDue,
            amountPaid: 0,
            status: 'pending',
            paidAt: null,
            transactionIds: [],
        });
    }

    return {
        principal,
        annualRate: annualRatePercent,
        durationMonths,
        startDate,
        monthlyPayment,
        totalInterest,
        totalAmount: principal + totalInterest,
        installments,
    };
}

/**
 * Quick simulation for the frontend simulator (no schedule, just monthly payment)
 * Returns values in euros (not minor units) for display
 */
export function simulateCredit(
    amountEuros: number,
    annualRatePercent: number,
    durationMonths: number
): { monthlyPayment: number; totalCost: number; totalInterest: number; taeg: number } {
    const principalMinor = Math.round(amountEuros * 100);
    const monthlyMinor = calculateMonthlyPayment(principalMinor, annualRatePercent, durationMonths);
    const totalMinor = monthlyMinor * durationMonths;
    const totalInterestMinor = totalMinor - principalMinor;

    return {
        monthlyPayment: monthlyMinor / 100,
        totalCost: totalMinor / 100,
        totalInterest: totalInterestMinor / 100,
        taeg: annualRatePercent, // Simplified; real TAEG includes fees
    };
}
