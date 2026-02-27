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
    if (existing) {
        await prisma.member.update({
            where: { phone },
            data: { profileCompleted: false },
        });
        console.log('Compte Admin existant : profil mis à "non complété" pour tester la redirection.');
    }
    else {
        const passwordHash = await bcrypt.hash('password123', 10);
        await prisma.member.create({
            data: {
                phone,
                passwordHash,
                firstName: 'Admin',
                lastName: 'AFC',
                role: client_1.Role.ADMIN,
                profileCompleted: false,
                profilePhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC',
            },
        });
        console.log('Compte Admin créé. Connexion: 0600000000 / password123 — première connexion → Compléter mon profil.');
    }
    const monthlyExists = await prisma.contribution.findFirst({
        where: { type: client_1.ContributionType.MONTHLY },
    });
    if (!monthlyExists) {
        await prisma.contribution.create({
            data: {
                name: 'Cotisation mensuelle',
                type: client_1.ContributionType.MONTHLY,
                amount: 5000,
                frequency: client_1.PaymentFrequency.MONTHLY,
            },
        });
        console.log('Cotisation mensuelle par défaut créée (5 000 FCFA/mois, échéance 10).');
    }
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map