"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
var dotenv = __importStar(require("dotenv"));
var crypto_1 = __importDefault(require("crypto"));
dotenv.config({ path: '.env.local' });
var MONGODB_URI = process.env.MONGODB_URI;
var DB_NAME = 'altiafinance';
function generateClientNumber(index) {
    return "CL-2026-".concat(String(index).padStart(6, '0'));
}
function hashPassword(password) {
    var salt = crypto_1.default.randomBytes(16).toString('hex');
    var hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return "".concat(salt, ":").concat(hash);
}
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var client, db, settingsCol, defaultSettings, _i, defaultSettings_1, setting, productsCol, products, _a, products_1, product, adminPasswordRaw, clientPasswordRaw, adminHash, clientHash, adminCol, adminEmail, usersCol, loansCol, clients, _b, clients_1, c, userId, kycData, existingUser, finalUserId, hasLoan, amount, application;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('🌱 Starting comprehensive seed with Crypto (scrypt)...');
                    client = new mongodb_1.MongoClient(MONGODB_URI);
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _e.sent();
                    db = client.db(DB_NAME);
                    // ──────────────────── SETTINGS ────────────────────
                    console.log('\n📋 Seeding settings...');
                    settingsCol = db.collection('settings');
                    defaultSettings = [
                        { key: 'initial_deposit_amount', value: 10000, updatedAt: new Date(), updatedBy: null },
                        { key: 'guarantee_deposit_percentage', value: 10, updatedAt: new Date(), updatedBy: null },
                        { key: 'guarantee_deposit_deadline_days', value: 14, updatedAt: new Date(), updatedBy: null },
                        { key: 'currency', value: 'XOF', updatedAt: new Date(), updatedBy: null },
                        { key: 'platform_name', value: 'Altia Finance', updatedAt: new Date(), updatedBy: null },
                        { key: 'support_email', value: (_c = process.env.EMAIL_FROM) !== null && _c !== void 0 ? _c : 'support@altiafinance.com', updatedAt: new Date(), updatedBy: null },
                    ];
                    _i = 0, defaultSettings_1 = defaultSettings;
                    _e.label = 2;
                case 2:
                    if (!(_i < defaultSettings_1.length)) return [3 /*break*/, 5];
                    setting = defaultSettings_1[_i];
                    return [4 /*yield*/, settingsCol.updateOne({ key: setting.key }, { $setOnInsert: setting }, { upsert: true })];
                case 3:
                    _e.sent();
                    _e.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('  ✅ Settings configured.');
                    // ──────────────────── LOAN PRODUCTS ────────────────────
                    console.log('\n🏦 Seeding loan products...');
                    productsCol = db.collection('loanProducts');
                    products = [
                        {
                            slug: 'pret-personnel', name: 'Prêt Personnel', category: 'personnel',
                            description: 'Financez tous vos projets personnels.',
                            minAmount: 10000000, maxAmount: 500000000, minDurationMonths: 6, maxDurationMonths: 60,
                            annualInterestRate: 14.5, taeg: 16.2, requiredDocuments: ['id_card_front', 'id_card_back', 'proof_of_address', 'payslip_3months'],
                            active: true, createdAt: new Date(), updatedAt: new Date(),
                        },
                        {
                            slug: 'pret-auto', name: 'Prêt Auto', category: 'auto',
                            description: 'Achetez votre véhicule neuf ou d\'occasion.',
                            minAmount: 20000000, maxAmount: 1500000000, minDurationMonths: 12, maxDurationMonths: 84,
                            annualInterestRate: 13.5, taeg: 15.1, requiredDocuments: [],
                            active: true, createdAt: new Date(), updatedAt: new Date(),
                        },
                        {
                            slug: 'mini-pret', name: 'Mini Prêt Express', category: 'mini_pret',
                            description: 'Un coup de pouce rapide pour une dépense imprévue.',
                            minAmount: 1000000, maxAmount: 50000000, minDurationMonths: 1, maxDurationMonths: 12,
                            annualInterestRate: 18.0, taeg: 20.5, requiredDocuments: [],
                            active: true, createdAt: new Date(), updatedAt: new Date(),
                        },
                    ];
                    _a = 0, products_1 = products;
                    _e.label = 6;
                case 6:
                    if (!(_a < products_1.length)) return [3 /*break*/, 9];
                    product = products_1[_a];
                    return [4 /*yield*/, productsCol.updateOne({ slug: product.slug }, { $setOnInsert: product }, { upsert: true })];
                case 7:
                    _e.sent();
                    _e.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log('  ✅ Loan products configured.');
                    adminPasswordRaw = 'Admin2024!';
                    clientPasswordRaw = 'Client2024!';
                    console.log('\n🔑 Hashing passwords...');
                    adminHash = hashPassword(adminPasswordRaw);
                    clientHash = hashPassword(clientPasswordRaw);
                    // ──────────────────── ADMIN USER ────────────────────
                    console.log('\n👤 Seeding admin user...');
                    adminCol = db.collection('adminUsers');
                    adminEmail = (_d = process.env.ADMIN_INITIAL_EMAIL) !== null && _d !== void 0 ? _d : 'admin@altiafinance.com';
                    return [4 /*yield*/, adminCol.updateOne({ email: adminEmail }, {
                            $set: {
                                name: 'Super Admin',
                                passwordHash: adminHash, // Update with new scrypt hash!
                                role: 'superadmin',
                                active: true,
                                updatedAt: new Date()
                            }
                        }, { upsert: true })];
                case 10:
                    _e.sent();
                    console.log("  \u2705 Admin created/updated: ".concat(adminEmail, " (password: ").concat(adminPasswordRaw, ")"));
                    // ──────────────────── CLIENT USERS & LOANS ────────────────────
                    console.log('\n👥 Seeding dummy clients and loans...');
                    usersCol = db.collection('users');
                    loansCol = db.collection('loanApplications');
                    clients = [
                        { idx: 1, fname: 'Jean', lname: 'Sans-KYC', email: 'jean@test.com', status: 'not_started' },
                        { idx: 2, fname: 'Marie', lname: 'En-Attente-KYC', email: 'marie@test.com', status: 'pending' },
                        { idx: 3, fname: 'Paul', lname: 'Pret-En-Attente', email: 'paul@test.com', status: 'verified', loanStatus: 'decision_pending' },
                        { idx: 4, fname: 'Sophie', lname: 'Attente-Garantie', email: 'sophie@test.com', status: 'verified', loanStatus: 'approved_pending_guarantee' },
                        { idx: 5, fname: 'Luc', lname: 'Pret-A-Decaisser', email: 'luc@test.com', status: 'verified', loanStatus: 'guarantee_paid' },
                        { idx: 6, fname: 'Julie', lname: 'Remboursement-Actif', email: 'julie@test.com', status: 'verified', loanStatus: 'disbursed' },
                    ];
                    _b = 0, clients_1 = clients;
                    _e.label = 11;
                case 11:
                    if (!(_b < clients_1.length)) return [3 /*break*/, 20];
                    c = clients_1[_b];
                    userId = new mongodb_1.ObjectId();
                    kycData = { status: c.status };
                    if (c.status !== 'not_started') {
                        kycData.documents = [
                            { type: 'cni', url: '#dummy', uploadedAt: new Date() },
                            { type: 'paySlip', url: '#dummy', uploadedAt: new Date() },
                        ];
                    }
                    return [4 /*yield*/, usersCol.findOne({ email: c.email })];
                case 12:
                    existingUser = _e.sent();
                    finalUserId = existingUser ? existingUser._id : userId;
                    if (!!existingUser) return [3 /*break*/, 14];
                    return [4 /*yield*/, usersCol.insertOne({
                            _id: finalUserId,
                            clientNumber: generateClientNumber(c.idx),
                            firstName: c.fname,
                            lastName: c.lname,
                            email: c.email,
                            phone: "+229 9000000".concat(c.idx),
                            passwordHash: clientHash,
                            emailVerified: true, // Auto verified
                            nationalIdType: 'cni',
                            nationalIdNumber: 'Encrypted-Dummy-ID-0000',
                            dateOfBirth: new Date('1990-01-01'),
                            profession: 'Employé Test',
                            monthlyIncome: 450000,
                            kyc: kycData,
                            initialDeposit: {
                                status: 'paid',
                                amount: 1000000, // 10k FCFA
                                paidAt: new Date()
                            },
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })];
                case 13:
                    _e.sent();
                    console.log("  \u2705 Client created: ".concat(c.email, " (KYC: ").concat(c.status, ")"));
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, usersCol.updateOne({ _id: finalUserId }, { $set: { kyc: kycData, passwordHash: clientHash } } // Force update to new scrypt hash 
                    )];
                case 15:
                    _e.sent();
                    _e.label = 16;
                case 16:
                    if (!c.loanStatus) return [3 /*break*/, 19];
                    return [4 /*yield*/, loansCol.findOne({ userId: finalUserId })];
                case 17:
                    hasLoan = _e.sent();
                    if (!!hasLoan) return [3 /*break*/, 19];
                    amount = 50000000;
                    application = {
                        applicationNumber: "LN-".concat(Date.now().toString().slice(-6), "-").concat(c.idx),
                        userId: finalUserId,
                        productSlug: 'pret-personnel',
                        productName: 'Prêt Personnel',
                        amount: amount,
                        duration: 12,
                        annualRate: 14.5,
                        purpose: "Achat d'ordinateur pour dev",
                        status: c.loanStatus,
                        statusHistory: [
                            { status: 'submitted', changedAt: new Date(), changedBy: finalUserId, note: 'Demande initiale' }
                        ],
                        guaranteeDeposit: undefined,
                        disbursement: undefined,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    if (['approved_pending_guarantee', 'guarantee_paid', 'disbursed'].includes(c.loanStatus)) {
                        application.guaranteeDeposit = {
                            required: amount * 0.10, // 10%
                            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
                            status: c.loanStatus === 'approved_pending_guarantee' ? 'pending' : 'paid'
                        };
                        application.statusHistory.push({ status: 'approved_pending_guarantee', changedAt: new Date(), changedBy: 'admin', note: 'Approuvé' });
                    }
                    if (c.loanStatus === 'guarantee_paid') {
                        application.guaranteeDeposit.paidAt = new Date();
                        application.guaranteeDeposit.txReference = 'PAY-DEMO-123';
                    }
                    if (c.loanStatus === 'disbursed') {
                        application.disbursement = { method: 'bank_transfer', disbursedAt: new Date(), reference: 'V-DEMO-456' };
                    }
                    return [4 /*yield*/, loansCol.insertOne(application)];
                case 18:
                    _e.sent();
                    console.log("     \u21B3 Loan added: ".concat(c.loanStatus));
                    _e.label = 19;
                case 19:
                    _b++;
                    return [3 /*break*/, 11];
                case 20:
                    console.log('\n🎉 Comprehensive Seed completed successfully!');
                    console.log('----------------------------------------------------');
                    console.log('🔗 UTILISATEURS POUR TEST');
                    console.log("\uD83D\uDC6E Admin      : admin@altiafinance.com / Admin2024!");
                    console.log("\uD83D\uDC64 Client (A) : marie@test.com   / Client2024! (KYC en attente)");
                    console.log("\uD83D\uDC64 Client (B) : paul@test.com    / Client2024! (Pr\u00EAt en attente)");
                    console.log("\uD83D\uDC64 Client (C) : sophie@test.com  / Client2024! (Attente Garantie)");
                    console.log("\uD83D\uDC64 Client (D) : luc@test.com     / Client2024! (Pr\u00EAt \u00E0 d\u00E9caisser)");
                    console.log('----------------------------------------------------');
                    return [4 /*yield*/, client.close()];
                case 21:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    });
}
seed().catch(function (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
