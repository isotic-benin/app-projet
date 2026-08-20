import nodemailer from 'nodemailer';
import { getDb, COLLECTIONS } from './db';
import { ObjectId } from 'mongodb';

const smtpHost = process.env.SMTP_HOST || 'mail.altiafinance.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@altiafinance.com';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  // LWS présente un certificat wildcard (*.lwspanel.com) sur les boîtes mail des clients :
  // on contourne la vérification du nom d'hôte tout en gardant une connexion chiffrée TLS.
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
  },
  auth: {
    user: process.env.SMTP_USER || fromEmail,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  templateName: string;
  variables: Record<string, any>;
  relatedApplicationId?: string | ObjectId;
  attachments?: { filename: string; content: string }[];
}

/**
 * Core email sender function. Logs all outbound emails into `emailLogs`.
 */
export async function sendEmail({ to, subject, html, templateName, variables, relatedApplicationId, attachments }: SendEmailParams) {
  try {
    await transporter.sendMail({
      from: `Altia Finance <${fromEmail}>`,
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({ filename: a.filename, content: a.content, encoding: 'base64' })),
    });

    const db = await getDb();
    await db.collection(COLLECTIONS.EMAIL_LOGS).insertOne({
      to,
      subject,
      template: templateName,
      variables,
      relatedApplicationId: relatedApplicationId ? new ObjectId(relatedApplicationId) : null,
      status: 'sent',
      errorMessage: null,
      sentAt: new Date(),
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[EMAIL ERROR]', error);

    // Log failure blindly to email logs
    try {
      const db = await getDb();
      await db.collection(COLLECTIONS.EMAIL_LOGS).insertOne({
        to,
        subject,
        template: templateName,
        variables,
        relatedApplicationId: relatedApplicationId ? new ObjectId(relatedApplicationId) : null,
        status: 'failed',
        errorMessage: error.message,
        sentAt: new Date(),
      });
    } catch {
      // Ignore if DB is down as well
    }

    return { success: false, error };
  }
}

// ────────────────────────────────────────────────
// Pre-defined Email Templates
// ────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, firstName: string, token: string) {
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #0B1B33;">
      <h2 style="color: #0082f0;">Bienvenue chez Altia Finance, ${firstName} !</h2>
      <p>Merci de vous être inscrit sur notre plateforme. Pour finaliser la création de votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #0082f0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Vérifier mon email
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">Ce lien expirera dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Vérifiez votre adresse email - Altia Finance',
    html,
    templateName: 'email_verification',
    variables: { firstName, verifyLink },
  });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reinitialisation?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #0B1B33;">
      <h2 style="color: #0082f0;">Réinitialisation de votre mot de passe, ${firstName}</h2>
      <p>Vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte Altia Finance.</p>
      <p>Vous pouvez définir un nouveau mot de passe en cliquant sur le lien ci-dessous :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #0082f0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">Ce lien expirera dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Demande de réinitialisation de mot de passe - Altia Finance',
    html,
    templateName: 'password_reset',
    variables: { firstName, resetLink },
  });
}

// ────────────────────────────────────────────────
// Email templates
// ────────────────────────────────────────────────

function formatEuro(amountCents: number): string {
  return (amountCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
}

function computeMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const r = (annualRate / 100) / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export async function sendKycDecisionEmail(email: string, firstName: string, decision: 'approve' | 'reject', reason?: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0B1B33; border: 1px solid #E5E5EA; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #E6007E, #B3005F); padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Altia Finance</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #0B1B33; margin-top: 0;">Bonjour ${firstName},</h2>
        ${decision === 'approve' ? `
          <p>Nous avons le plaisir de vous annoncer que vos documents ont été <strong style="color: #1E9E5A;">validés</strong> par notre équipe conformité.</p>
          <p>Votre compte est désormais <strong>activé</strong>. Vous pouvez dès à présent soumettre votre demande de crédit en ligne, gratuitement.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/mon-compte/prets/demande" style="background-color: #E6007E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">
              Faire une demande de crédit
            </a>
          </div>
        ` : `
          <p>Nous avons le regret de vous informer que votre dossier de vérification (KYC) a été <strong style="color: #D3273E;">rejeté</strong>.</p>
          ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          <p>Vous pouvez corriger vos informations et soumettre à nouveau vos documents en vous connectant à votre espace client.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/mon-compte/kyc" style="background-color: #E6007E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">
              Compléter mon dossier
            </a>
          </div>
        `}
        <p style="color: #5C5C66; font-size: 13px;">L'équipe Altia Finance reste à votre disposition.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: decision === 'approve' ? 'Votre compte Altia Finance est activé' : 'Votre dossier Altia Finance a été rejeté',
    html,
    templateName: 'kyc_decision',
    variables: { firstName, decision, reason },
  });
}

/**
 * Envoie une offre de prêt / contrat propre par email au client.
 * Contient les conditions : dépôt de garantie (10%), frais d'étude de dossier (50 €),
 * taux d'intérêt, échéancier prévisionnel et mentions légales.
 */
export async function sendLoanContractEmail({
  to,
  user,
  application,
  subject,
  customMessage,
  attachments,
}: {
  to: string;
  user: { firstName: string; lastName: string; clientNumber: string };
  application: {
    id?: string | ObjectId;
    applicationNumber: string;
    productName: string;
    amount: number;
    duration: number;
    annualRate: number;
    guaranteeAmount: number;
    studyFee: number;
    deadline: Date | null;
    createdByAdmin?: string;
  };
  subject?: string;
  customMessage?: string;
  attachments?: { filename: string; content: string }[];
}) {
  const amount = application.amount;
  const rate = application.annualRate;
  const months = application.duration;
  const monthlyPayment = computeMonthlyPayment(amount, rate, months);

  let totalCost = 0;
  let remaining = amount;
  const r = (rate / 100) / 12;
  for (let i = 1; i <= months; i++) {
    const interest = Math.round(remaining * r);
    let cap = monthlyPayment - interest;
    if (i === months) cap = remaining;
    remaining = Math.max(0, remaining - cap);
    totalCost += cap + interest;
  }
  const totalInterest = totalCost - amount;

  const guarantee = application.guaranteeAmount;
  const studyFee = application.studyFee;

  const deadline = application.deadline;
  const deadlineText = deadline
    ? `avant le ${deadline.toLocaleDateString('fr-FR')} (${Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} jours)`
    : 'sous un délai de 14 jours à compter de la réception de ce contrat';

  const finalSubject = subject || `Contrat de prêt ${application.productName} — Dossier ${application.applicationNumber}`;

  const rows = Array.from({ length: Math.min(months, 6) }, (_, i) => {
    const num = i + 1;
    const due = new Date();
    due.setMonth(due.getMonth() + num);
    return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #EEEEF0; text-align: center;">${num}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #EEEEF0; text-align: center;">${due.toLocaleDateString('fr-FR')}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #EEEEF0; text-align: right;">${formatEuro(monthlyPayment)}</td>
        </tr>`;
  }).join('');

  const html = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0B1B33; border: 1px solid #E5E5EA; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #E6007E, #B3005F); padding: 28px 32px; text-align: center;">
      <h1 style="color: white; margin: 0 0 4px 0; font-size: 22px; letter-spacing: 0.5px;">OFFRE DE PRÊT PERSONNALISÉE</h1>
      <p style="color: #FCE4F0; margin: 0; font-size: 13px;">Contrat de crédit — Document officiel Altia Finance</p>
    </div>

    <div style="padding: 32px 36px;">
      <p style="font-size: 14px; color: #5C5C66;">Réf. dossier : <strong style="color: #0B1B33; font-family: monospace;">${application.applicationNumber}</strong></p>
      <p style="font-size: 14px; color: #5C5C66;">Émis le : <strong style="color: #0B1B33;">${new Date().toLocaleDateString('fr-FR')}</strong></p>

      <div style="background: #F7F7F9; border: 1px solid #E5E5EA; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #5C5C66;">Client</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold;">${user.firstName} ${user.lastName}</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #5C5C66;">N° client : <span style="font-family: monospace;">${user.clientNumber || '—'}</span> · ${to}</p>
      </div>

      ${customMessage ? `<div style="background: #FCE4F0; border: 1px solid #E6007E33; border-radius: 12px; padding: 16px 20px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0B1B33;">${customMessage}</p></div>` : ''}

      <h2 style="font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #E6007E; padding-bottom: 6px;">1. Récapitulatif de votre prêt</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #5C5C66;">Produit</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${application.productName}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Montant emprunté</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatEuro(amount)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Durée</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${months} mois</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Taux d'intérêt annuel</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${rate}%</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Mensualité fixe</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatEuro(monthlyPayment)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Coût total du crédit (intérêts)</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatEuro(totalInterest)}</td></tr>
        <tr><td style="padding: 6px 0; color: #5C5C66;">Total à rembourser</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatEuro(totalCost)}</td></tr>
      </table>

      <h2 style="font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #E6007E; padding-bottom: 6px;">2. Conditions de votre prêt</h2>
      <div style="background: #FFF8E1; border: 1px solid #FFE082; border-radius: 12px; padding: 16px 20px; margin: 12px 0;">
        <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Dépôt de garantie (10% du montant approuvé) :</strong> ${formatEuro(guarantee)}</p>
        <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Frais d'étude de dossier :</strong> ${formatEuro(studyFee)} (non remboursables)</p>
        <p style="margin: 0; font-size: 14px;"><strong>Délai de versement de la garantie :</strong> ${deadlineText}</p>
      </div>
      <p style="font-size: 13px; color: #5C5C66; line-height: 1.6;">Ces frais couvrent l'étude approfondie de votre dossier (vérification des revenus, des documents et de votre capacité de remboursement). Les fonds ne seront débloqués qu'après réception <em>et</em> validation de votre dépôt de garantie.</p>

      <h2 style="font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #E6007E; padding-bottom: 6px;">3. Échéancier prévisionnel (aperçu)</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #F7F7F9; border-radius: 8px;">
        <thead>
          <tr style="background: #0B1B33; color: white;">
            <th style="padding: 8px 12px; text-align: center;">N°</th>
            <th style="padding: 8px 12px; text-align: center;">Échéance</th>
            <th style="padding: 8px 12px; text-align: right;">Mensualité</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="font-size: 12px; color: #9E9EA8; margin-top: 8px;">Aperçu des 6 premières échéances sur ${months}. L'échéancier complet vous sera communiqué après décaissement des fonds.</p>

      <h2 style="font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #E6007E; padding-bottom: 6px;">4. Votre accord</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #0B1B33;">Pour accepter cette offre et débloquer vos fonds :</p>
      <ol style="font-size: 14px; line-height: 1.9; color: #0B1B33; padding-left: 20px;">
        <li>Versez le dépôt de garantie de <strong>${formatEuro(guarantee)}</strong> et les frais d'étude de <strong>${formatEuro(studyFee)}</strong> sur le compte indiqué par notre équipe (virement ou Mobile Money).</li>
        <li>Répondez à cet email en confirmant votre accord sur les conditions du présent contrat.</li>
        <li>Notre équipe validera votre versement et procédera au décaissement sous 48-72h.</li>
      </ol>

      <div style="background: #F7F7F9; border-radius: 12px; padding: 16px 20px; margin-top: 24px; font-size: 12px; color: #5C5C66; line-height: 1.7;">
        <strong style="color: #0B1B33;">Mentions légales :</strong> Ce document constitue une offre de prêt. Le crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager. En cas de défaut de paiement, des pénalités de retard pourront s'appliquer conformément aux conditions générales. Les données collectées sont traitées conformément à notre politique de confidentialité.
      </div>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E5EA; display: flex; justify-content: space-between; font-size: 12px; color: #5C5C66;">
        <div>Altia Finance — Plateforme de microfinance<br/>Service Relations Clients</div>
        <div style="text-align: right;">Document généré automatiquement<br/>Signature électronique valide</div>
      </div>
    </div>
  </div>
  `;

  return sendEmail({
    to,
    subject: finalSubject,
    html,
    templateName: 'loan_contract',
    variables: {
      applicationNumber: application.applicationNumber,
      amount: formatEuro(amount),
      rate,
      months,
      guarantee: formatEuro(guarantee),
      studyFee: formatEuro(studyFee),
    },
    relatedApplicationId: (application as any).id || undefined,
    attachments,
  });
}

/**
 * Envoie le contrat de prêt en PDF (fichier joint) directement au client.
 */
export async function sendLoanContractPdfEmail({
  to,
  user,
  application,
  pdfBuffer,
  pdfFileName,
  customMessage,
}: {
  to: string;
  user: { firstName: string; lastName: string; clientNumber: string };
  application: {
    id?: string | ObjectId;
    applicationNumber: string;
    productName: string;
    amount: number;
    duration: number;
    annualRate: number;
    guaranteeAmount: number;
    studyFee: number;
  };
  pdfBuffer: Buffer;
  pdfFileName: string;
  customMessage?: string;
}) {
  const guarantee = application.guaranteeAmount;
  const studyFee = application.studyFee;
  const amount = application.amount;
  const monthly = computeMonthlyPayment(amount, application.annualRate, application.duration);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #0B1B33; border: 1px solid #E5E5EA; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0B1B33, #005bbb); padding: 28px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Altia Finance</h1>
        <p style="color: #9db8ff; margin: 6px 0 0 0; font-size: 13px;">Contrat de prêt — ${application.applicationNumber}</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="margin-top: 0; color: #0B1B33;">Bonjour ${user.firstName} ${user.lastName},</h2>
        <p style="color: #5C5C66; line-height: 1.6;">
          Félicitations, votre demande de prêt <strong>${application.productName}</strong> a été <strong style="color: #1E9E5A;">approuvée</strong> !
          Veuillez trouver ci-joint votre contrat de crédit au format PDF.
        </p>
        <div style="background: #F7F7F9; border: 1px solid #E5E5EA; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #5C5C66;">Montant : <strong style="color: #0B1B33;">${formatEuro(amount)}</strong></p>
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #5C5C66;">Durée : <strong style="color: #0B1B33;">${application.duration} mois</strong> · Taux : <strong style="color: #0B1B33;">${application.annualRate}%</strong></p>
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #5C5C66;">Mensualité : <strong style="color: #0B1B33;">${formatEuro(monthly)}</strong></p>
          <p style="margin: 0; font-size: 14px; color: #5C5C66;">Garantie (10%) : <strong style="color: #0B1B33;">${formatEuro(guarantee)}</strong> · Frais d'étude : <strong style="color: #0B1B33;">${formatEuro(studyFee)}</strong></p>
        </div>
        ${customMessage ? `<div style="background: #E6F4FF; border: 1px solid #0082f033; border-radius: 12px; padding: 16px 20px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0B1B33;">${customMessage}</p></div>` : ''}
        <p style="color: #5C5C66; line-height: 1.6;">
          <strong>Prochaine étape :</strong> téléchargez le contrat ci-joint, imprimez-le, signez-le puis déposez la version signée (PDF)
          dans votre espace client <strong>Espace client → Mes Crédits → Signer mon contrat</strong>. Notre équipe procédera alors au déblocage de vos fonds.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.NEXTAUTH_URL}/mon-compte/prets" style="background-color: #0082f0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">
            Accéder à mon espace client
          </a>
        </div>
        <p style="color: #9E9EA8; font-size: 12px; line-height: 1.6;">Ce document constitue une offre de prêt. Le crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Votre contrat de prêt ${application.productName} — Dossier ${application.applicationNumber}`,
    html,
    templateName: 'loan_contract_pdf',
    variables: {
      applicationNumber: application.applicationNumber,
      amount: formatEuro(amount),
      guarantee: formatEuro(guarantee),
      studyFee: formatEuro(studyFee),
    },
    relatedApplicationId: (application as any).id || undefined,
    attachments: [{ filename: pdfFileName, content: pdfBuffer.toString('base64') }],
  });
}