import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export interface ContractPdfInput {
    applicationNumber: string;
    productName: string;
    amount: number; // en centimes
    duration: number;
    annualRate: number;
    guaranteeAmount: number; // en centimes
    studyFee: number; // en centimes
    firstName: string;
    lastName: string;
    clientNumber?: string;
    email?: string;
    purpose?: string;
}

const NAVY = rgb(0.043, 0.106, 0.2);
const BLUE = rgb(0, 0.51, 0.94);
const LIGHT = rgb(0.957, 0.969, 0.98);
const BORDER = rgb(0.886, 0.906, 0.94);
const GRAY = rgb(0.42, 0.45, 0.51);
const DARK = rgb(0.13, 0.16, 0.22);

function formatEuro(cents: number): string {
    return (cents / 100)
        .toLocaleString('fr-FR', { minimumFractionDigits: 2 })
        .replace(/[\u202F\u00A0]/g, ' ') + ' €';
}

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const r = annualRate / 100 / 12;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * Génère le contrat de prêt en PDF avec toutes les conditions du crédit.
 * Retourne un Buffer compatible avec l'envoi d'email (attachement) et le stockage local.
 */
export async function generateLoanContractPdf(input: ContractPdfInput): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4 portrait

    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

    const { width, height } = page.getSize();
    const margin = 48;
    const maxWidth = width - margin * 2;

    const monthly = computeMonthlyPayment(input.amount, input.annualRate, input.duration);

    let totalInterest = 0;
    let totalCost = 0;
    let remainingClient = input.amount;
    const rLoop = input.annualRate / 100 / 12;
    for (let i = 1; i <= input.duration; i++) {
        const intDue = Math.round(remainingClient * rLoop);
        let capDue = monthly - intDue;
        if (i === input.duration) capDue = remainingClient;
        remainingClient = Math.max(0, remainingClient - capDue);
        totalInterest += intDue;
        totalCost += capDue + intDue;
    }

    let y = height - margin;

    // ─── Header band ───
    page.drawRectangle({ x: 0, y: height - 130, width, height: 130, color: NAVY });
    page.drawRectangle({ x: 0, y: height - 134, width, height: 4, color: BLUE });

    page.drawText('Altia Finance', {
        x: margin,
        y: height - 52,
        size: 24,
        font: helveticaBold,
        color: rgb(1, 1, 1),
    });
    page.drawText('PLATEFORME DE MICROFINANCE & CRÉDIT EN LIGNE', {
        x: margin,
        y: height - 70,
        size: 8.5,
        font: helvetica,
        color: rgb(0.62, 0.75, 0.96),
    });

    page.drawText('CONTRAT DE CRÉDIT', {
        x: width - margin - 220,
        y: height - 60,
        size: 18,
        font: helveticaBold,
        color: rgb(1, 1, 1),
    });
    page.drawText(`Réf. ${input.applicationNumber}`, {
        x: width - margin - 220,
        y: height - 80,
        size: 10,
        font: helvetica,
        color: rgb(0.72, 0.82, 1),
    });

    y = height - 160;

    // ─── Section : identification ───
    const sectionTitle = (title: string, spaceAfter = 10) => {
        page.drawText(title, { x: margin, y, size: 13, font: helveticaBold, color: NAVY });
        page.drawLine({ start: { x: margin, y: y - 3 }, end: { x: margin + 32, y: y - 3 }, thickness: 2, color: BLUE });
        y -= spaceAfter;
    };

    const rowLabel = (label: string, value: string, valueColor = DARK, extraY = 0) => {
        page.drawText(label, { x: margin, y, size: 10.5, font: helveticaBold, color: GRAY });
        page.drawText(value, { x: margin + 180, y, size: 10.5, font: helvetica, color: valueColor });
        y -= 17 + extraY;
    };

    sectionTitle("1. Identification de l'emprunteur", 14);
    rowLabel('Nom complet', `${input.firstName} ${input.lastName}`);
    rowLabel('N° client', input.clientNumber || '—');
    if (input.email) rowLabel('Email', input.email);
    rowLabel('Produit', input.productName);
    if (input.purpose) {
        const lines = wrapText(`Objet : ${input.purpose}`, helvetica, 10, maxWidth);
        lines.forEach((line) => {
            page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: DARK });
            y -= 15;
        });
    }

    y -= 10;

    // ─── Section : conditions financières ───
    sectionTitle('2. Conditions financières du prêt', 14);

    const conditionRows: [string, string][] = [
        ['Montant emprunté', formatEuro(input.amount)],
        ['Durée du prêt', `${input.duration} mois`],
        ["Taux d'intérêt annuel (TAEG incl.)", `${input.annualRate}%`],
        ['Mensualité fixe', formatEuro(monthly)],
        ['Coût total du crédit (intérêts)', formatEuro(totalInterest)],
        ['Total à rembourser', formatEuro(totalCost)],
        ['Dépôt de garantie (10%)', formatEuro(input.guaranteeAmount)],
        ["Frais d'étude de dossier", formatEuro(input.studyFee)],
    ];

    const rowH = 22;
    const tableWidth = maxWidth;
    page.drawRectangle({ x: margin, y: y - rowH * conditionRows.length - 12, width: tableWidth, height: rowH * conditionRows.length + 12, color: LIGHT, borderColor: BORDER, borderWidth: 1 });

    conditionRows.forEach(([label, value], i) => {
        const ry = y - rowH * (i + 1) - 6;
        const isTotal = label.startsWith('Total');
        page.drawText(label, { x: margin + 12, y: ry + 5, size: 10, font: helvetica, color: GRAY });
        page.drawText(value, {
            x: margin + tableWidth - 12,
            y: ry + 5,
            size: isTotal ? 11.5 : 10,
            font: helveticaBold,
            color: isTotal ? BLUE : NAVY,
        });
    });

    y -= rowH * conditionRows.length + 22;

    // ─── Section : échéancier prévisionnel ───
    sectionTitle('3. Échéancier prévisionnel (aperçu des 6 premières échéances)', 14);

    const colWidths = [40, 130, 130, 130, 110];
    const colX = colWidths.reduce<number[]>((acc, w, i) => {
        acc.push(i === 0 ? margin : acc[i - 1] + colWidths[i - 1]);
        return acc;
    }, []);
    const colRight = colX.map((x, i) => x + colWidths[i]);

    const headerH = 24;
    page.drawRectangle({ x: margin, y: y - headerH, width: tableWidth, height: headerH, color: NAVY });

    const headers = ['N°', 'Échéance', 'Capital', 'Intérêts', 'Mensualité'];
    headers.forEach((h, i) => {
        const align = i === 0 ? 'left' : 'right';
        const textWidth = helveticaBold.widthOfTextAtSize(h, 9.5);
        const hx = align === 'left' ? colX[i] + 10 : colRight[i] - textWidth - 10;
        page.drawText(h, { x: hx, y: y - headerH + 8, size: 9.5, font: helveticaBold, color: rgb(1, 1, 1) });
    });
    y -= headerH;

    const numRows = Math.min(input.duration, 6);
    const r = input.annualRate / 100 / 12;
    for (let i = 1; i <= numRows; i++) {
        const balI = balBefore(input.amount, monthly, r, i);
        const interestI = Math.round(balI * r);
        let capitalI = monthly - interestI;
        if (i === input.duration) {
            capitalI = balI;
        }
        const paymentI = capitalI + interestI;

        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);

        const cells = [
            String(i),
            dueDate.toLocaleDateString('fr-FR'),
            formatEuro(capitalI),
            formatEuro(interestI),
            formatEuro(paymentI),
        ];

        const bg = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.965, 0.973, 0.98);
        page.drawRectangle({ x: margin, y: y - 22, width: tableWidth, height: 22, color: bg });

        cells.forEach((c, ci) => {
            const textWidth = helvetica.widthOfTextAtSize(c, 9);
            const cx = ci === 0 ? colX[ci] + 10 : colRight[ci] - textWidth - 10;
            page.drawText(c, { x: cx, y: y - 15, size: 9, font: helvetica, color: DARK });
        });
        y -= 22;
    }

    page.drawLine({ start: { x: margin, y: y }, end: { x: margin + tableWidth, y }, thickness: 1, color: BORDER });
    y -= 18;

    // ─── Section : garantie & frais ───
    sectionTitle('4. Garantie et frais', 12);
    const mention1 = `Le déblocage des fonds est subordonné au versement du dépôt de garantie de ${formatEuro(input.guaranteeAmount)} (10% du montant approuvé) et des frais d'étude de dossier de ${formatEuro(input.studyFee)} (non remboursables). Ces frais couvrent l'étude approfondie du dossier : vérification des revenus, des documents et de la capacité de remboursement.`;
    const mention2 = "En signant ce contrat, l'emprunteur s'engage à rembourser la mensualité fixe à la date d'échéance indiquée dans l'échéancier. Tout retard de paiement entraîne des pénalités conformément aux conditions générales. Le crédit vous engage et doit être remboursé : vérifiez vos capacités de remboursement avant de vous engager.";

    wrapText(mention1, helvetica, 9.5, maxWidth).forEach((line) => {
        page.drawText(line, { x: margin, y, size: 9.5, font: helvetica, color: DARK, lineHeight: 13 });
        y -= 13;
    });
    y -= 8;
    wrapText(mention2, helvetica, 9.5, maxWidth).forEach((line) => {
        page.drawText(line, { x: margin, y, size: 9.5, font: helvetica, color: DARK, lineHeight: 13 });
        y -= 13;
    });

    y -= 22;

    // ─── Signature block ───
    sectionTitle('5. Acceptation et signature', 14);

    page.drawRectangle({ x: margin, y: y - 88, width: tableWidth, height: 88, color: LIGHT, borderColor: BORDER, borderWidth: 1 });

    const leftX = margin + 20;
    const rightX = margin + tableWidth / 2 + 20;

    page.drawText('L’emprunteur', { x: leftX, y: y - 20, size: 10.5, font: helveticaBold, color: NAVY });
    page.drawText('Signature précédée de la mention', { x: leftX, y: y - 35, size: 8.5, font: helvetica, color: GRAY });
    page.drawText('« Lu et approuvé »', { x: leftX, y: y - 47, size: 8.5, font: timesItalic, color: GRAY });
    page.drawLine({ start: { x: leftX, y: y - 68 }, end: { x: leftX + 180, y: y - 68 }, thickness: 0.8, color: GRAY });
    page.drawText('Nom, date et signature', { x: leftX, y: y - 82, size: 8, font: helvetica, color: GRAY });

    page.drawText('Altia Finance', { x: rightX, y: y - 20, size: 10.5, font: helveticaBold, color: NAVY });
    page.drawText('Pour la société', { x: rightX, y: y - 35, size: 8.5, font: helvetica, color: GRAY });
    page.drawText('Cachet et signature', { x: rightX, y: y - 47, size: 8.5, font: helvetica, color: GRAY });
    page.drawLine({ start: { x: rightX, y: y - 68 }, end: { x: rightX + 180, y: y - 68 }, thickness: 0.8, color: GRAY });
    page.drawText('Administration Altia Finance', { x: rightX, y: y - 82, size: 8, font: helvetica, color: GRAY });

    // ─── Footer ───
    page.drawRectangle({ x: 0, y: 0, width, height: 40, color: NAVY });
    page.drawText(`Altia Finance — Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} — Réf. ${input.applicationNumber}`, {
        x: margin,
        y: 15,
        size: 8,
        font: helvetica,
        color: rgb(0.62, 0.75, 0.96),
    });

    const bytes = await doc.save();
    return Buffer.from(bytes);
}

function balBefore(principal: number, monthly: number, r: number, month: number): number {
    let bal = principal;
    for (let j = 1; j < month; j++) {
        const interest = Math.round(bal * r);
        const capital = monthly - interest;
        bal = Math.max(0, bal - capital);
    }
    return bal;
}