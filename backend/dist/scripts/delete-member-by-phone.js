"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const phone = process.argv[2];
    if (!phone) {
        console.error('Usage : npx tsx scripts/delete-member-by-phone.ts <phone>');
        process.exit(1);
    }
    const member = await prisma.member.findUnique({
        where: { phone },
        select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            profileCompleted: true,
            createdAt: true,
        },
    });
    if (!member) {
        console.error(`Aucun membre trouvé avec le numéro "${phone}"`);
        process.exit(1);
    }
    console.log('--- Membre trouvé ---');
    console.log(member);
    const [paymentsCount, expensesCount, transfersCount, announcementsCount, photosCount] = await Promise.all([
        prisma.payment.count({ where: { memberId: member.id } }),
        prisma.expense.count({ where: { requestedById: member.id } }),
        prisma.cashBoxTransfer.count({ where: { requestedById: member.id } }),
        prisma.announcement.count({ where: { authorId: member.id } }),
        prisma.photo.count({ where: { uploadedById: member.id } }),
    ]);
    console.log('--- Relations bloquantes ---');
    console.log({ paymentsCount, expensesCount, transfersCount, announcementsCount, photosCount });
    if (paymentsCount || expensesCount || transfersCount || announcementsCount || photosCount) {
        console.error('❌ Le membre a des données métier (paiements/dépenses/annonces...). Suppression refusée.');
        process.exit(1);
    }
    const deletedLogs = await prisma.notificationLog.deleteMany({ where: { memberId: member.id } });
    console.log(`✓ ${deletedLogs.count} NotificationLog supprimé(s)`);
    await prisma.member.delete({ where: { id: member.id } });
    console.log(`✓ Membre ${member.phone} (${member.firstName} ${member.lastName}) supprimé avec succès.`);
}
main()
    .catch((e) => {
    console.error('Erreur :', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=delete-member-by-phone.js.map