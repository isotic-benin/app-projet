# Guide technique complet — Plateforme de Microfinance (module Crédits)
### Stack : Next.js (App Router) + MongoDB uniquement

Ce document est conçu pour être soumis tel quel à un outil comme Claude Code afin de générer l'intégralité du projet. Il couvre : l'architecture, le design system inspiré de floabank.fr, le modèle de données MongoDB complet, la machine à états des dossiers, tous les parcours utilisateur et administrateur de bout en bout, l'arborescence Next.js, la sécurité, et les notifications.

---

## 0. Règles métier fondamentales (à respecter strictement dans le code)

1. Un client ne peut **soumettre une demande de prêt** que si son compte a le statut `active`, c'est-à-dire après un **dépôt initial de 100 €** (ou équivalent en devise locale) vérifié et validé par un administrateur.
2. Après **validation du dossier de prêt par un administrateur** (contact effectué par email), le client dispose d'un délai **strict de 14 jours calendaires** pour verser **10 % du montant du prêt approuvé** (« dépôt de garantie »). Les fonds ne sont jamais débloqués avant réception ET validation de ce dépôt.
3. Si le délai de 14 jours expire sans versement validé, le dossier passe automatiquement au statut `expired` et le prêt n'est pas décaissé (le client peut redéposer une nouvelle demande).
4. Toute somme versée par un client (dépôt initial, dépôt de garantie, remboursement) doit transiter par un workflow **preuve de paiement → vérification humaine par un admin → validation** avant d'impacter un solde ou de faire avancer un statut. Il n'y a pas de crédit automatique d'un compte sans validation admin (sauf si vous intégrez plus tard une passerelle de paiement automatisée).
5. **Un seul rôle administrateur** existe au départ (vous). Le modèle prévoit toutefois une notion de rôle pour évoluer facilement vers plusieurs agents plus tard.
6. Toute action sensible (décision sur un dossier, validation d'un dépôt, envoi d'email) doit être tracée dans un journal d'audit (`auditLogs`).

---

## 1. Architecture technique globale

```
┌─────────────────────────────┐
│        Next.js (App Router) │
│  - Pages publiques (SSR/SSG)│
│  - Espace client (CSR/SSR)  │
│  - Back-office admin        │
│  - API Routes (REST)        │
└───────────┬──────────────────┘
            │
      ┌─────▼─────┐
      │  MongoDB  │  (Atlas recommandé, ou self-hosted)
      │  Driver natif "mongodb" OU Mongoose │
      └─────┬─────┘
            │
   ┌────────┴─────────┐
   │ Stockage fichiers │  (justificatifs KYC, preuves de paiement)
   │ S3-compatible ou  │  → JAMAIS de fichiers publics : URLs signées
   │ Cloudinary        │
   └───────────────────┘
            │
   ┌────────┴─────────┐
   │ Service Email     │  (Resend, Postmark, SendGrid, ou Nodemailer+SMTP)
   └───────────────────┘
            │
   ┌────────┴─────────┐
   │ Cron / Jobs       │  (Vercel Cron ou node-cron) → vérification des
   │                   │  délais de 14 jours, rappels, relances
   └───────────────────┘
```

**Stack précise recommandée :**
- Next.js 14+ (App Router, Server Actions + API Routes)
- TypeScript (fortement recommandé pour la fiabilité du code financier)
- MongoDB natif (`mongodb` npm package) avec une couche d'accès `lib/db.ts`, ou Mongoose si vous préférez des schémas déclarés
- NextAuth.js (Auth.js) pour l'authentification client ET admin (deux « providers »/deux tables logiques)
- Zod pour la validation de toutes les entrées (formulaires + API)
- Tailwind CSS pour le style (permet de reproduire fidèlement une charte comme celle de Floa)
- react-hook-form pour les formulaires multi-étapes
- Un service de stockage de fichiers (S3/Cloudinary/Supabase Storage) — MongoDB ne doit pas stocker les fichiers binaires eux-mêmes (sauf GridFS en dernier recours)
- Un service d'envoi d'email transactionnel (Resend recommandé pour la simplicité avec Next.js)

---

## 2. Design system (inspiré de floabank.fr)

> Remarque : pour une fidélité à 100 %, ouvrez floabank.fr dans les DevTools du navigateur et relevez les valeurs exactes (`getComputedStyle`) des couleurs, polices et rayons de bordure. Ci-dessous, une charte de travail cohérente avec l'identité visuelle observée (dominante rose/magenta, cartes arrondies, gros CTA en pilule), à ajuster avec les vraies valeurs prélevées.

### Palette de couleurs (variables CSS / Tailwind config)
```css
:root {
  --color-primary: #E6007E;       /* rose/magenta - couleur de marque, CTA principaux */
  --color-primary-dark: #B3005F;
  --color-primary-light: #FCE4F0;
  --color-secondary: #0B1B33;     /* bleu nuit / texte foncé */
  --color-background: #FFFFFF;
  --color-surface: #F7F7F9;       /* fond des cartes/sections alternées */
  --color-success: #1E9E5A;
  --color-warning: #E8A000;
  --color-danger: #D3273E;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #5C5C66;
  --color-border: #E5E5EA;
}
```

### Typographie
- Police : une sans-serif géométrique/humaniste (ex. `Poppins`, `Inter` ou `Sora`) — titres en graisse 700-800, corps en 400-500
- Hiérarchie : H1 36-48px, H2 28-32px, H3 20-24px, body 16px, small 14px

### Composants UI à reproduire
- **Boutons pilule** (`border-radius: 999px`), fond magenta plein pour l'action principale, contour pour l'action secondaire
- **Cartes produits** arrondies (`border-radius: 20-24px`), ombre légère, icône + titre + description courte + CTA
- **Simulateur interactif** : sliders/inputs numériques avec résultat de mensualité recalculé en temps réel (composant client `SimulateurCredit.tsx`)
- **Bandeau de confiance** : logos/chiffres clés (nombre de clients, note moyenne) sous le hero
- **Accordéon FAQ**
- **Stepper de formulaire** (1. Infos personnelles → 2. Projet → 3. Documents → 4. Confirmation) pour les parcours de souscription
- **Bannières de statut** (badges colorés : en attente = orange, validé = vert, rejeté = rouge, expire dans J jours = orange avec compte à rebours)

---

## 3. Modèle de données MongoDB (complet)

Toutes les collections ci-dessous, avec les champs, types, contraintes et index recommandés. Utilisez des `ObjectId` pour les références et activez la validation de schéma MongoDB (`$jsonSchema`) en complément de Zod côté application pour une double sécurité.

### 3.1 `users` (clients)
```ts
{
  _id: ObjectId,
  clientNumber: string,          // ex: "FL-2026-000123", généré séquentiellement
  firstName: string,
  lastName: string,
  email: string,                 // unique, index unique
  emailVerified: boolean,
  emailVerifiedAt: Date | null,
  phone: string,                 // unique, format E.164
  phoneVerified: boolean,
  passwordHash: string,          // argon2id
  dateOfBirth: Date,
  nationalIdType: "CNI" | "PASSPORT" | "AUTRE",
  nationalIdNumber: string,      // à chiffrer au repos (voir §7)
  address: {
    street: string,
    city: string,
    country: string,
  },
  profession: string,
  monthlyIncome: number | null,
  kyc: {
    status: "not_started" | "pending" | "verified" | "rejected",
    documents: [
      {
        _id: ObjectId,
        type: "id_card_front" | "id_card_back" | "proof_of_address" | "selfie",
        fileUrl: string,          // URL signée / clé de stockage
        uploadedAt: Date,
        status: "pending" | "approved" | "rejected",
        reviewedBy: ObjectId | null,   // ref adminUsers
        reviewedAt: Date | null,
        rejectionReason: string | null,
      }
    ],
    reviewedBy: ObjectId | null,
    reviewedAt: Date | null,
    rejectionReason: string | null,
  },
  status: "pending_verification" | "active" | "suspended" | "closed",
  twoFactorEnabled: boolean,
  lastLoginAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```
**Index :** `email` (unique), `phone` (unique), `clientNumber` (unique), `status`.

### 3.2 `accounts` (compte du client — épargne/dépôt)
```ts
{
  _id: ObjectId,
  userId: ObjectId,              // ref users, index
  accountNumber: string,         // unique, généré
  currency: "XOF" | "EUR",       // adaptez à votre marché (FCFA pour le Bénin)
  balance: number,               // en unité mineure (centimes) pour éviter les erreurs flottantes
  status: "pending_initial_deposit" | "active" | "frozen" | "closed",
  initialDeposit: {
    requiredAmount: number,      // 100 (ou équivalent XOF), configurable via `settings`
    status: "pending" | "submitted" | "validated" | "rejected",
    transactionId: ObjectId | null,  // ref transactions
    validatedAt: Date | null,
    validatedBy: ObjectId | null,    // ref adminUsers
  },
  openedAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
```
**Index :** `userId` (unique — un compte principal par client dans ce MVP), `accountNumber` (unique), `status`.

### 3.3 `transactions` (tous les mouvements financiers : dépôt initial, garantie 10 %, décaissement, remboursement)
```ts
{
  _id: ObjectId,
  reference: string,             // unique, ex "TXN-2026-000456"
  userId: ObjectId,
  accountId: ObjectId,
  type: "initial_deposit" | "guarantee_deposit" | "disbursement" | "repayment" | "fee" | "refund",
  amount: number,                // unité mineure
  currency: string,
  method: "bank_transfer" | "mobile_money" | "cash_agency" | "card",
  proof: {
    fileUrl: string | null,      // justificatif uploadé par le client
    uploadedAt: Date | null,
  },
  status: "pending_client_action" | "submitted" | "under_review" | "validated" | "rejected",
  relatedLoanApplicationId: ObjectId | null,   // ref loanApplications, si lié à un prêt
  reviewedBy: ObjectId | null,    // ref adminUsers
  reviewedAt: Date | null,
  rejectionReason: string | null,
  createdAt: Date,
  updatedAt: Date,
}
```
**Index :** `userId`, `accountId`, `relatedLoanApplicationId`, `status`, `reference` (unique).

### 3.4 `loanProducts` (catalogue — reproduit le module Crédits de Floa)
```ts
{
  _id: ObjectId,
  slug: string,                  // "pret-personnel", "pret-auto", "pret-travaux", "mini-pret", ...
  name: string,
  category: "personnel" | "auto" | "travaux" | "mini_pret" | "renouvelable" | "autre",
  description: string,
  minAmount: number,
  maxAmount: number,
  minDurationMonths: number,
  maxDurationMonths: number,
  annualInterestRate: number,    // taux nominal annuel (%)
  taeg: number,                  // taux annuel effectif global (%)
  requiredDocuments: string[],   // ex: ["id_card","proof_of_address","payslip_3months","tax_notice"]
  active: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.5 `loanSimulations` (traçabilité des simulations, connectées ou anonymes)
```ts
{
  _id: ObjectId,
  userId: ObjectId | null,       // null si visiteur non connecté
  productId: ObjectId,
  amount: number,
  durationMonths: number,
  computedMonthlyPayment: number,
  computedTaeg: number,
  createdAt: Date,
}
```

### 3.6 `loanApplications` (dossiers de demande de prêt — cœur du système)
```ts
{
  _id: ObjectId,
  applicationNumber: string,     // unique, ex "DOS-2026-000789"
  userId: ObjectId,
  accountId: ObjectId,
  productId: ObjectId,

  // Données de la demande
  amountRequested: number,
  durationMonthsRequested: number,
  purpose: string,               // objet du prêt
  employmentStatus: string,
  employer: string | null,
  monthlyIncome: number,
  monthlyExpenses: number | null,

  documents: [
    {
      _id: ObjectId,
      type: string,               // correspond à requiredDocuments du produit
      fileUrl: string,
      uploadedAt: Date,
      status: "pending" | "approved" | "rejected",
    }
  ],

  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "additional_info_requested"
    | "approved"
    | "rejected"
    | "awaiting_guarantee_deposit"
    | "guarantee_deposit_submitted"
    | "guarantee_deposit_validated"
    | "disbursed"
    | "active"
    | "completed"
    | "defaulted"
    | "expired"
    | "cancelled",

  // Renseigné à la décision admin
  decision: {
    approvedAmount: number | null,
    approvedDurationMonths: number | null,
    approvedRate: number | null,
    decidedBy: ObjectId | null,   // ref adminUsers
    decidedAt: Date | null,
    notes: string | null,
  },

  // Dépôt de garantie (règle des 10% / 14 jours)
  guaranteeDeposit: {
    requiredAmount: number | null,     // = 10% de approvedAmount
    dueDate: Date | null,              // = decidedAt + 14 jours
    transactionId: ObjectId | null,    // ref transactions
    status: "not_required" | "awaiting_payment" | "submitted" | "validated" | "expired",
    validatedAt: Date | null,
    validatedBy: ObjectId | null,
  },

  disbursement: {
    disbursedAt: Date | null,
    disbursedBy: ObjectId | null,
    method: "bank_transfer" | "mobile_money" | "cash_agency" | null,
    transactionId: ObjectId | null,
  },

  emailThread: [
    {
      _id: ObjectId,
      direction: "outbound",         // (MVP = admin -> client uniquement)
      subject: string,
      body: string,
      template: string | null,
      sentBy: ObjectId,              // ref adminUsers
      sentAt: Date,
    }
  ],

  statusHistory: [
    {
      status: string,
      changedAt: Date,
      changedBy: ObjectId | null,    // null si automatique (cron)
      note: string | null,
    }
  ],

  createdAt: Date,
  updatedAt: Date,
}
```
**Index :** `userId`, `status`, `applicationNumber` (unique), `guaranteeDeposit.dueDate` (pour le job cron), `productId`.

### 3.7 `repaymentSchedules` (tableau d'amortissement, généré au décaissement)
```ts
{
  _id: ObjectId,
  loanApplicationId: ObjectId,   // unique
  principal: number,
  annualRate: number,
  durationMonths: number,
  startDate: Date,
  installments: [
    {
      number: number,               // 1..N
      dueDate: Date,
      principalDue: number,
      interestDue: number,
      totalDue: number,
      amountPaid: number,           // cumulé
      status: "pending" | "paid" | "partial" | "late",
      paidAt: Date | null,
      transactionIds: ObjectId[],   // remboursements liés
    }
  ],
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.8 `adminUsers`
```ts
{
  _id: ObjectId,
  name: string,
  email: string,                 // unique
  passwordHash: string,
  role: "superadmin" | "agent",  // extensible plus tard
  twoFactorEnabled: boolean,
  twoFactorSecret: string | null,
  active: boolean,
  lastLoginAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.9 `auditLogs`
```ts
{
  _id: ObjectId,
  actorType: "admin" | "client" | "system",
  actorId: ObjectId | null,
  action: string,                // ex: "loan_application.approved", "deposit.validated"
  targetType: string,            // "loanApplication" | "transaction" | "user" | ...
  targetId: ObjectId,
  metadata: object,              // données contextuelles (avant/après si pertinent)
  ipAddress: string | null,
  userAgent: string | null,
  createdAt: Date,
}
```

### 3.10 `emailLogs`
```ts
{
  _id: ObjectId,
  to: string,
  subject: string,
  template: string,
  variables: object,
  relatedApplicationId: ObjectId | null,
  status: "sent" | "failed",
  errorMessage: string | null,
  sentAt: Date,
}
```

### 3.11 `settings` (paramètres globaux, modifiables par l'admin)
```ts
{
  _id: ObjectId,
  key: "initial_deposit_amount" | "guarantee_deposit_percentage" | "guarantee_deposit_deadline_days" | "currency" | ...,
  value: any,       // ex: 100, 10, 14, "XOF"
  updatedAt: Date,
  updatedBy: ObjectId | null,
}
```
> Ne codez jamais en dur les valeurs 100 €, 10 % et 14 jours : chargez-les depuis `settings` pour pouvoir les ajuster sans redéploiement.

---

## 4. Machine à états du dossier de prêt (`loanApplications.status`)

```
draft
  └─▶ submitted
        └─▶ under_review
              ├─▶ additional_info_requested ──▶ under_review (boucle)
              ├─▶ rejected                                   [FIN]
              └─▶ approved
                    └─▶ awaiting_guarantee_deposit  (dueDate = decidedAt + 14j)
                          ├─▶ guarantee_deposit_submitted
                          │     ├─▶ guarantee_deposit_validated
                          │     │     └─▶ disbursed
                          │     │           └─▶ active
                          │     │                 ├─▶ completed        [FIN]
                          │     │                 └─▶ defaulted        [FIN]
                          │     └─▶ (rejet du justificatif) ──▶ awaiting_guarantee_deposit
                          └─▶ expired (si dueDate dépassée sans validation)  [FIN]
```
Toute transition doit :
1. Être exécutée via une fonction serveur unique `transitionLoanApplication(id, newStatus, actor, note)` qui vérifie que la transition est autorisée (table de transitions valides) — jamais de changement direct de statut ailleurs dans le code.
2. Pousser une entrée dans `statusHistory`.
3. Écrire une entrée dans `auditLogs`.
4. Déclencher l'email correspondant (voir §8).

---

## 5. Parcours utilisateur — Client (bout en bout)

### 5.1 Simulation de crédit (accès libre, sans compte)
1. Le visiteur arrive sur la page `/credits` ou la page produit (`/credits/pret-personnel`).
2. Il utilise le composant `SimulateurCredit` (sliders montant/durée).
3. À chaque changement, un appel `POST /api/loans/simulate` calcule la mensualité (formule d'amortissement, voir §9) et enregistre (optionnel) une trace dans `loanSimulations`.
4. CTA « Faire une demande » → redirige vers l'inscription si non connecté, sinon vers le formulaire de demande pré-rempli avec le produit/montant/durée choisis.

### 5.2 Création de compte
1. `/inscription` : formulaire (nom, prénom, email, téléphone, mot de passe, date de naissance).
2. `POST /api/auth/register` : validation Zod, hash du mot de passe (argon2), création `users` avec `status = "pending_verification"`.
3. Email de vérification envoyé (lien à jeton signé, expirant sous 24h) → `GET /api/auth/verify-email?token=...` marque `emailVerified = true`.
4. Après vérification email, le client est invité à compléter son KYC : upload pièce d'identité (recto/verso) + justificatif de domicile via un composant d'upload sécurisé (`POST /api/kyc/upload`, fichiers stockés hors MongoDB, seule l'URL/clé est enregistrée).
5. `users.kyc.status = "pending"`. Le client voit un écran « Votre dossier est en cours de vérification ».
6. **Côté admin** : validation manuelle du KYC (voir §6.2) → `kyc.status = "verified"`, un `account` est automatiquement créé avec `status = "pending_initial_deposit"`.

### 5.3 Dépôt initial obligatoire de 100 €
1. Une fois le KYC validé, le client accède à `/mon-compte/depot-initial`.
2. La page affiche : montant requis (`settings.initial_deposit_amount`), moyens de paiement acceptés (virement bancaire avec référence unique **ou** mobile money selon votre configuration), et un formulaire d'upload de preuve de paiement.
3. Le client effectue le virement/dépôt en dehors de la plateforme (ou via une intégration de paiement si vous en ajoutez une plus tard), puis uploade la preuve : `POST /api/accounts/initial-deposit`.
4. Une `transaction` de type `initial_deposit` est créée avec `status = "submitted"`, `account.initialDeposit.status = "submitted"`.
5. **Admin** vérifie et valide (§6.3) → `transaction.status = "validated"`, `account.balance += 100`, `account.status = "active"`, `account.initialDeposit.status = "validated"`.
6. Email automatique « Votre compte est activé » envoyé au client.

> ⚠️ Tant que `account.status !== "active"`, toute tentative d'accès à `/prets/nouvelle-demande` doit être bloquée côté serveur (pas seulement côté UI) avec redirection vers l'écran de dépôt initial.

### 5.4 Demande de prêt
1. `/prets/nouvelle-demande` : formulaire multi-étapes (stepper) :
   - Étape 1 : choix du produit (`loanProducts`), montant, durée → recalcul mensualité en direct
   - Étape 2 : situation professionnelle et financière (revenus, charges, employeur)
   - Étape 3 : upload des documents requis (`product.requiredDocuments`)
   - Étape 4 : récapitulatif + case « je certifie l'exactitude des informations » + signature électronique simplifiée (case à cocher horodatée + IP, ou intégration DocuSign/Yousign si vous voulez une vraie signature électronique qualifiée)
2. `POST /api/loans/apply` : crée `loanApplications` avec `status = "submitted"`, `statusHistory` initialisé, email de confirmation envoyé au client, notification visible dans le dashboard admin.
3. Le client peut suivre l'état de sa demande sur `/prets/[applicationNumber]` (badge de statut, historique, documents, prochaine action attendue).

### 5.5 Décision de l'administrateur
(voir §6.4 pour le détail du côté admin)
- Si `additional_info_requested` : le client reçoit un email avec la demande précise, et peut re-soumettre des documents/informations via `/prets/[id]/complement`.
- Si `rejected` : email de refus avec motif (générique ou personnalisé), dossier clôturé.
- Si `approved` : le système calcule automatiquement `guaranteeDeposit.requiredAmount = approvedAmount * 10%` et `dueDate = decidedAt + 14 jours`, statut → `awaiting_guarantee_deposit`. Email envoyé avec : montant exact à verser, moyens de paiement, date limite, instructions d'upload de preuve.

### 5.6 Versement du dépôt de garantie (10 %)
1. Le client voit sur `/prets/[id]` un bandeau avec compte à rebours jusqu'à `dueDate`.
2. Il effectue le versement (virement/mobile money) et uploade la preuve : `POST /api/loans/[id]/guarantee-deposit`.
3. Création d'une `transaction` de type `guarantee_deposit`, `status = "submitted"`, `loanApplication.guaranteeDeposit.status = "submitted"`.
4. **Admin** valide (§6.5) → `transaction.status = "validated"`, `guaranteeDeposit.status = "validated"`, statut du dossier → `guarantee_deposit_validated`.
5. **Job cron quotidien** (`/api/cron/check-guarantee-deadlines`) : parcourt les dossiers `awaiting_guarantee_deposit` ou `guarantee_deposit_submitted` dont `dueDate < now` sans validation → statut → `expired`, email envoyé au client, entrée `auditLogs` (acteur = system).
   - Envoyer aussi un rappel automatique à J-3 avant l'échéance (email de relance).

### 5.7 Décaissement du prêt
1. Une fois `guarantee_deposit_validated`, l'admin déclenche manuellement le décaissement (§6.6) — ou vous automatisez ce passage si vous le souhaitez.
2. Création d'une `transaction` de type `disbursement`, génération du `repaymentSchedules` (tableau d'amortissement complet, voir §9), statut du dossier → `disbursed` puis `active`.
3. Email « Vos fonds ont été décaissés » avec le tableau de remboursement en pièce jointe ou lien.

### 5.8 Remboursement
1. Le client consulte son échéancier sur `/prets/[id]/echeancier`.
2. À chaque échéance, il uploade une preuve de paiement (`POST /api/loans/[id]/repayment`), créant une `transaction` de type `repayment` en attente de validation.
3. **Admin** valide → l'installment correspondant passe à `paid`, `amountPaid` mis à jour.
4. Quand toutes les échéances sont soldées → `loanApplication.status = "completed"`.
5. Rappels automatiques (cron) avant chaque date d'échéance et en cas de retard (`status = "late"`).

---

## 6. Parcours administrateur (bout en bout)

### 6.1 Connexion admin
- `/admin/login` : authentification dédiée (table `adminUsers`), **2FA obligatoire** (TOTP), session distincte de celle des clients (cookie séparé + middleware `requireAdmin`).

### 6.2 Validation KYC
- `/admin/clients` : liste des clients filtrable par `kyc.status`.
- Fiche client : visionneuse de documents (URLs signées, jamais publiques), boutons Approuver/Rejeter (avec motif) par document et globalement.
- Action → met à jour `users.kyc`, crée l'`account` si approuvé, log `auditLogs`, email au client.

### 6.3 Validation des dépôts initiaux
- `/admin/transactions?type=initial_deposit&status=submitted` : file d'attente.
- Vue détail : montant déclaré, preuve (image/PDF), infos client → Valider/Rejeter.
- Validation → crédite `account.balance`, active le compte, email de confirmation.

### 6.4 Traitement des dossiers de prêt
- `/admin/dossiers` : tableau avec filtres (statut, produit, montant, date), recherche par nom/numéro de dossier.
- `/admin/dossiers/[id]` : vue complète —
  - Infos client + lien vers fiche client 360°
  - Détails de la demande (montant, durée, objet, revenus)
  - Documents (visionneuse + statut par document)
  - Zone de décision : boutons **Approuver** (saisie du montant/taux/durée définitifs, éventuellement différents de la demande), **Rejeter** (motif), **Demander un complément** (message libre)
  - **Éditeur d'email** : à chaque décision, un email pré-rempli (template selon le type de décision) s'ouvre pour être personnalisé avant envoi — c'est le canal de contact direct exigé par le cahier des charges (`POST /api/loans/[id]/decision` déclenche à la fois la mise à jour du statut ET l'envoi de l'email, avec sauvegarde dans `emailThread` et `emailLogs`)
  - Historique complet (`statusHistory`, `emailThread`)

### 6.5 Validation des dépôts de garantie (10 %)
- Même mécanique que §6.3 mais filtrée sur `type = guarantee_deposit`, avec affichage du montant attendu vs montant déclaré (alerte si écart) et de la date limite (`dueDate`) avec code couleur (vert / orange à J-3 / rouge si dépassé).

### 6.6 Décaissement
- Bouton « Décaisser » visible uniquement quand `status = guarantee_deposit_validated`.
- Formulaire : méthode de décaissement, référence de virement/mobile money.
- Déclenche génération de l'échéancier (`repaymentSchedules`) via la fonction d'amortissement (§9).

### 6.7 Suivi des remboursements
- `/admin/remboursements` : file d'attente des preuves de remboursement à valider, vue par dossier des échéances en retard.

### 6.8 Tableau de bord (accueil admin)
KPIs à afficher :
- Nombre de dossiers par statut (funnel)
- Montant total décaissé / en cours de remboursement
- Dépôts en attente de validation (compteur avec lien direct)
- Dossiers dont le délai des 14 jours expire dans ≤ 3 jours (alerte prioritaire)
- Taux de défaut, taux d'acceptation

### 6.9 Paramètres
- `/admin/parametres` : édition des valeurs de `settings` (montant dépôt initial, % garantie, délai en jours, devise), gestion des `loanProducts` (CRUD), gestion des templates d'email.

### 6.10 Journal d'audit
- `/admin/audit` : lecture seule, filtrable par acteur/action/date — traçabilité complète exigée pour un système financier.

---

## 7. Sécurité (obligatoire pour un système financier)

1. **Authentification** : NextAuth.js avec provider Credentials, mots de passe hashés en **argon2id** (jamais bcrypt seul pour un nouveau projet si argon2 est disponible), politique de mot de passe forte, verrouillage après N échecs.
2. **Sessions** : cookies `httpOnly`, `secure`, `sameSite=strict`, expiration courte + refresh, séparation stricte session client / session admin.
3. **2FA obligatoire pour tous les comptes admin** (TOTP via `otplib`), fortement recommandé pour les clients aussi (au minimum au moment des actions sensibles : demande de prêt, validation de dépôt).
4. **Chiffrement au repos** des champs sensibles (`nationalIdNumber`, adresse) via chiffrement applicatif (AES-256-GCM avec clé gérée par un KMS ou variable d'environnement forte) avant écriture en base.
5. **Fichiers** : jamais stockés dans MongoDB en clair/public. Utiliser un bucket privé (S3/Cloudinary) avec URLs signées à durée de vie courte, scan antivirus optionnel à l'upload, restriction de type MIME et de taille.
6. **Validation systématique** de toutes les entrées avec Zod côté serveur (jamais uniquement côté client), y compris les montants (bornes min/max, pas de valeurs négatives).
7. **Montants en unité mineure** (centimes) stockés en `Int`/`Number` — jamais de calculs flottants directs sur des euros pour éviter les erreurs d'arrondi.
8. **Idempotence** des endpoints financiers sensibles (validation de dépôt, décaissement) — utiliser une clé d'idempotence ou vérifier l'état actuel avant d'agir pour éviter les doubles validations en cas de double clic/retry.
9. **Rate limiting** sur les routes d'authentification, d'upload et de simulation (ex. avec Upstash Ratelimit ou un middleware maison).
10. **RBAC strict** côté API : chaque route admin vérifie le rôle (`superadmin`/`agent`) via middleware, chaque route client vérifie que la ressource appartient bien à l'utilisateur connecté (`userId` du token === `userId` du document).
11. **Audit log immuable** (`auditLogs`) pour toute action de décision, validation financière, changement de paramètre.
12. **Conformité protection des données** : si votre activité est basée au Bénin, vérifiez les obligations auprès de l'**APDP** (Autorité de Protection des Données à caractère Personnel) ; sinon adaptez au RGPD si vous avez des clients européens — politique de confidentialité, durée de conservation des documents KYC, droit d'accès/suppression.
13. **HTTPS obligatoire** partout (forcé via redirection + HSTS), variables secrètes uniquement en variables d'environnement (jamais commitées).
14. **Logs d'accès et de sécurité** séparés des logs métier, alerte en cas de comportement anormal (nombreuses tentatives de connexion, uploads suspects).

---

## 8. Emails transactionnels (déclencheurs et contenu)

| Déclencheur | Destinataire | Contenu clé |
|---|---|---|
| Inscription | Client | Lien de vérification email |
| KYC validé | Client | Confirmation + invitation à faire le dépôt initial |
| KYC rejeté | Client | Motif + invitation à re-soumettre |
| Dépôt initial validé | Client | Confirmation compte activé, solde |
| Dossier de prêt soumis | Client | Accusé de réception + numéro de dossier |
| Dossier de prêt soumis | Admin (interne) | Notification nouveau dossier à traiter |
| Complément d'information demandé | Client | Détail de ce qui manque |
| Dossier rejeté | Client | Motif |
| Dossier approuvé | Client | Montant approuvé, **montant exact du dépôt de garantie (10 %)**, **date limite précise (J+14)**, moyens de paiement |
| Relance dépôt de garantie (J-3) | Client | Rappel avec compte à rebours |
| Dépôt de garantie validé | Client | Confirmation, prochaine étape = décaissement |
| Délai 14 jours expiré | Client | Dossier annulé, possibilité de refaire une demande |
| Fonds décaissés | Client | Confirmation + lien vers l'échéancier |
| Rappel d'échéance | Client | Montant et date de la prochaine échéance |
| Échéance en retard | Client | Relance |
| Prêt soldé | Client | Confirmation de clôture |

Tous les emails envoyés dans le cadre d'un dossier de prêt doivent être dupliqués dans `loanApplications.emailThread` (pour l'historique visible côté admin) et dans `emailLogs` (pour la traçabilité technique/anti-fraude).

---

## 9. Calcul financier — formule d'amortissement

Mensualité à taux fixe (amortissement constant) :

```
r = tauxAnnuel / 12 / 100          // taux mensuel
n = duréeEnMois
M = P * r * (1 + r)^n / ((1 + r)^n - 1)     // P = principal
```

Fonction `lib/amortization.ts` à générer : prend `(principal, annualRate, durationMonths, startDate)` et retourne la liste des échéances avec, pour chacune, la part de capital et la part d'intérêt (méthode classique du tableau d'amortissement français), en travaillant en centimes pour éviter les erreurs d'arrondi, avec un ajustement de l'arrondi sur la dernière échéance pour que la somme corresponde exactement au capital emprunté.

---

## 10. Arborescence Next.js proposée

```
app/
  (public)/
    page.tsx                          → landing (hero, simulateur, avantages)
    credits/page.tsx                  → liste des produits de crédit
    credits/[slug]/page.tsx           → page produit + simulateur détaillé
    faq/page.tsx
  (auth)/
    inscription/page.tsx
    connexion/page.tsx
    verifier-email/page.tsx
  (client)/
    mon-compte/page.tsx                → dashboard client (solde, statut KYC)
    mon-compte/kyc/page.tsx
    mon-compte/depot-initial/page.tsx
    prets/nouvelle-demande/page.tsx
    prets/[applicationNumber]/page.tsx
    prets/[applicationNumber]/complement/page.tsx
    prets/[applicationNumber]/echeancier/page.tsx
  admin/
    login/page.tsx
    (protected)/
      dashboard/page.tsx
      clients/page.tsx
      clients/[id]/page.tsx
      dossiers/page.tsx
      dossiers/[id]/page.tsx
      transactions/page.tsx
      remboursements/page.tsx
      produits/page.tsx
      parametres/page.tsx
      audit/page.tsx
  api/
    auth/[...nextauth]/route.ts
    auth/register/route.ts
    auth/verify-email/route.ts
    kyc/upload/route.ts
    kyc/decision/route.ts             (admin)
    accounts/initial-deposit/route.ts
    accounts/initial-deposit/validate/route.ts   (admin)
    loans/simulate/route.ts
    loans/apply/route.ts
    loans/[id]/decision/route.ts      (admin)
    loans/[id]/guarantee-deposit/route.ts
    loans/[id]/guarantee-deposit/validate/route.ts  (admin)
    loans/[id]/disburse/route.ts      (admin)
    loans/[id]/repayment/route.ts
    loans/[id]/repayment/validate/route.ts  (admin)
    cron/check-guarantee-deadlines/route.ts
    cron/repayment-reminders/route.ts

lib/
  db.ts                 → connexion MongoDB singleton
  auth.ts                → config NextAuth
  mailer.ts              → envoi d'emails + templates
  amortization.ts         → calculs financiers
  storage.ts              → upload/URLs signées
  crypto.ts               → chiffrement des champs sensibles
  audit.ts                → helper d'écriture dans auditLogs
  loanStateMachine.ts      → transitions de statut autorisées
  validators/              → schémas Zod (un fichier par entité)

components/
  ui/                      → boutons, cartes, badges, stepper (design system §2)
  SimulateurCredit.tsx
  DocumentUploader.tsx
  StatusBadge.tsx
  AdminEmailComposer.tsx
```

---

## 11. Variables d'environnement à prévoir

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=
FILE_STORAGE_BUCKET=
FILE_STORAGE_ACCESS_KEY=
FILE_STORAGE_SECRET_KEY=
FIELD_ENCRYPTION_KEY=
CRON_SECRET=              (pour sécuriser les endpoints /api/cron/*)
```

---

## 12. Checklist MVP (ordre de développement recommandé)

1. Connexion MongoDB + modèles + validation Zod
2. Auth client (inscription, vérification email, connexion)
3. Upload KYC + back-office de validation KYC (même minimal)
4. Création automatique du compte + parcours dépôt initial + validation admin
5. Catalogue `loanProducts` (seed manuel des produits type Floa : personnel, auto, travaux, mini-prêt)
6. Simulateur de crédit (page publique)
7. Formulaire de demande de prêt + soumission
8. Back-office dossiers : décision + envoi d'email intégré
9. Logique dépôt de garantie 10 % + compte à rebours 14 jours + cron d'expiration
10. Décaissement + génération de l'échéancier
11. Suivi des remboursements
12. Audit log + 2FA admin + durcissement sécurité
13. Habillage complet avec le design system (§2)

---

Ce guide vous donne la totalité de la structure de données et des processus nécessaires pour que Claude Code puisse générer le projet Next.js + MongoDB dans son intégralité, module par module, en respectant vos deux règles métier centrales (dépôt initial de 100 € et dépôt de garantie de 10 % sous 14 jours).
