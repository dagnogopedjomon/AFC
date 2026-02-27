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
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcrypt"));
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error('DATABASE_URL is not set');
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const phone = '0600000000';
    const existing = await prisma.member.findUnique({ where: { phone } });
    const passwordHash = await bcrypt.hash('password123', 10);
    let adminId;
    if (existing) {
        await prisma.member.update({
            where: { phone },
            data: {
                passwordHash,
                profileCompleted: true,
                isSuspended: false,
            },
        });
        adminId = existing.id;
        console.log('Compte Admin mis à jour (mot de passe, profil, suspension annulée).');
    }
    else {
        const created = await prisma.member.create({
            data: {
                phone,
                passwordHash,
                firstName: 'Admin',
                lastName: 'AFC',
                role: client_1.Role.ADMIN,
                profileCompleted: true,
                isSuspended: false,
                profilePhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC',
            },
        });
        adminId = created.id;
        console.log('Compte Admin créé. Connexion: 0600000000 / password123');
    }
    const monthly = await prisma.contribution.findFirst({
        where: { type: client_1.ContributionType.MONTHLY },
    });
    if (monthly && monthly.amount != null) {
        const now = new Date();
        const amount = monthly.amount;
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const nextM = m === 12 ? 1 : m + 1;
        const nextY = m === 12 ? y + 1 : y;
        const periods = [
            { year: y, month: m },
            { year: nextY, month: nextM },
        ];
        for (const { year, month } of periods) {
            const exists = await prisma.payment.findFirst({
                where: {
                    memberId: adminId,
                    contributionId: monthly.id,
                    periodYear: year,
                    periodMonth: month,
                },
            });
            if (!exists) {
                await prisma.payment.create({
                    data: {
                        memberId: adminId,
                        contributionId: monthly.id,
                        amount,
                        periodYear: year,
                        periodMonth: month,
                    },
                });
                console.log(`Cotisation enregistrée pour l'admin : ${year}-${String(month).padStart(2, '0')}`);
            }
        }
    }
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=reset-admin.js.map