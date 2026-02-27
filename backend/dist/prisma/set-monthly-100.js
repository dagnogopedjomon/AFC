"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error('DATABASE_URL is not set');
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const updated = await prisma.contribution.updateMany({
        where: { type: client_1.ContributionType.MONTHLY },
        data: { amount: 100 },
    });
    if (updated.count === 0) {
        console.log('Aucune cotisation mensuelle trouvée. Exécutez d\'abord le seed (npm run prisma:seed ou équivalent).');
        return;
    }
    console.log('Cotisation mensuelle mise à 100 FCFA (test).');
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=set-monthly-100.js.map