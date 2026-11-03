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
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error('DATABASE_URL is not set');
const pool = new pg_1.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const phone = (process.argv[2] || process.env.ADMIN_PHONE || '0600000000').trim();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'password123';
const firstName = (process.env.ADMIN_FIRST_NAME || 'Admin').trim();
const lastName = (process.env.ADMIN_LAST_NAME || 'AFC').trim();
const profilePhotoUrl = process.env.ADMIN_PROFILE_PHOTO_URL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC';
const profileCompleted = process.env.ADMIN_PROFILE_COMPLETED === 'true';
const isSuspended = process.env.ADMIN_IS_SUSPENDED === 'true';
async function main() {
    if (!phone)
        throw new Error('Phone manquant. Usage: npm run create-admin -- <phone> <password>');
    if (!password)
        throw new Error('Password manquant. Usage: npm run create-admin -- <phone> <password>');
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.member.findUnique({ where: { phone } });
    if (existing) {
        const updated = await prisma.member.update({
            where: { phone },
            data: {
                passwordHash,
                firstName,
                lastName,
                role: client_1.Role.ADMIN,
                profilePhotoUrl,
                profileCompleted,
                isSuspended,
            },
        });
        console.log('Compte admin mis à jour.');
        console.log(`ID: ${updated.id}`);
        console.log(`Téléphone: ${updated.phone}`);
        console.log(`Nom: ${updated.firstName} ${updated.lastName}`);
        console.log(`Rôle: ${updated.role}`);
    }
    else {
        const created = await prisma.member.create({
            data: {
                phone,
                passwordHash,
                firstName,
                lastName,
                role: client_1.Role.ADMIN,
                profilePhotoUrl,
                profileCompleted,
                isSuspended,
            },
        });
        console.log('Compte admin créé.');
        console.log(`ID: ${created.id}`);
        console.log(`Téléphone: ${created.phone}`);
        console.log(`Nom: ${created.firstName} ${created.lastName}`);
        console.log(`Rôle: ${created.role}`);
    }
    console.log('\nIdentifiants de connexion :');
    console.log(`Téléphone: ${phone}`);
    console.log(`Mot de passe: ${password}`);
}
main()
    .then(() => prisma.$disconnect())
    .then(() => pool.end())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect().then(() => pool.end()).then(() => process.exit(1));
});
//# sourceMappingURL=create-admin.js.map