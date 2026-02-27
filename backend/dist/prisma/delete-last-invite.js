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
    const lastInvite = await prisma.member.findFirst({
        where: { passwordHash: null },
        orderBy: { createdAt: 'desc' },
    });
    if (!lastInvite) {
        console.log('Aucun membre invité (sans mot de passe) trouvé.');
        return;
    }
    await prisma.notificationLog.deleteMany({ where: { memberId: lastInvite.id } });
    await prisma.member.delete({ where: { id: lastInvite.id } });
    console.log(`Invitation supprimée : ${lastInvite.phone} (${lastInvite.firstName} ${lastInvite.lastName}). Tu peux réinviter ce numéro.`);
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=delete-last-invite.js.map