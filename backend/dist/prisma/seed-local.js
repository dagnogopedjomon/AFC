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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const connectionString = process.env.DATABASE_URL;
if (!connectionString?.includes('localhost:5433')) {
    throw new Error('Ce seed est protégé et fonctionne uniquement sur localhost:5433.');
}
const pool = new pg_1.Pool({ connectionString });
const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
async function main() {
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.member.create({ data: {
            phone: '0600000000', email: 'admin@afc.local', passwordHash,
            firstName: 'Admin', lastName: 'AFC', role: client_1.Role.ADMIN,
            profileCompleted: true, profilePhotoUrl: '/images/logo-afc.png',
        } });
    const profiles = [
        ['Kissmandy', 'Kouassi', '0701000001', client_1.Role.PLAYER, false],
        ['Franck', 'Pokou London', '0701000002', client_1.Role.PLAYER, true],
        ['Samba', 'Diallo', '0701000003', client_1.Role.PLAYER, false],
        ['Awa', 'Koné', '0701000004', client_1.Role.TREASURER, false],
        ['Yann', 'N’Guessan', '0701000005', client_1.Role.FORMER_PLAYER, true],
    ];
    const members = [];
    for (const [firstName, lastName, phone, role, isSuspended] of profiles) {
        members.push(await prisma.member.create({ data: {
                phone, passwordHash, firstName, lastName, role, isSuspended,
                profileCompleted: true, createdAt: new Date('2026-01-05T10:00:00Z'),
            } }));
    }
    const monthly = await prisma.contribution.create({ data: {
            name: 'Cotisation mensuelle', type: client_1.ContributionType.MONTHLY,
            amount: 20000, frequency: client_1.PaymentFrequency.MONTHLY,
        } });
    const exceptional = await prisma.contribution.create({ data: {
            name: 'Tournoi de fin de saison', type: client_1.ContributionType.EXCEPTIONAL,
            amount: 10000, deadline: new Date('2026-12-15T23:59:59Z'),
        } });
    const cashBox = await prisma.cashBox.create({ data: {
            name: 'Caisse principale', description: 'Caisse courante du club', isDefault: true,
        } });
    const now = new Date();
    for (let month = 1; month <= now.getMonth() + 1; month++) {
        for (const member of members.slice(0, 4)) {
            if ((member.phone === '0701000002' && month >= now.getMonth()) || member.phone === '0701000005')
                continue;
            await prisma.payment.create({ data: {
                    memberId: member.id, contributionId: monthly.id, cashBoxId: cashBox.id,
                    amount: 20000, periodYear: now.getFullYear(), periodMonth: month,
                    paidAt: new Date(now.getFullYear(), Math.min(month - 1, now.getMonth()), 6),
                    metadata: JSON.stringify({ source: 'seed_local' }),
                } });
        }
    }
    await prisma.payment.create({ data: { memberId: members[2].id, contributionId: exceptional.id, cashBoxId: cashBox.id, amount: 10000 } });
    await prisma.expense.create({ data: {
            amount: 45000, description: 'Achat de ballons et chasubles', expenseDate: new Date(),
            beneficiary: 'Équipe sportive', status: client_1.ExpenseStatus.APPROVED,
            cashBoxId: cashBox.id, requestedById: admin.id,
            treasurerApprovedById: admin.id, commissionerApprovedById: admin.id,
            treasurerApprovedAt: new Date(), commissionerApprovedAt: new Date(),
        } });
    console.log('Base AFC locale prête : 6 membres, cotisations, paiements et dépense de démonstration.');
    console.log('Connexion : admin@afc.local ou 0600000000 / password123');
}
main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
//# sourceMappingURL=seed-local.js.map