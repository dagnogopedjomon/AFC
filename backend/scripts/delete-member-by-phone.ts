/**
 * Supprime un membre par son numéro de téléphone.
 * Usage : npx tsx scripts/delete-member-by-phone.ts 0142015311
 *
 * Gère manuellement les relations avec onDelete=Restrict (NotificationLog, Payment...).
 * Refuse si le membre a des paiements, dépenses ou transferts (garde-fou).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Vérifier les relations bloquantes (onDelete=Restrict)
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
    console.error(
      '❌ Le membre a des données métier (paiements/dépenses/annonces...). Suppression refusée.',
    );
    process.exit(1);
  }

  // Supprimer dans l'ordre : NotificationLog (Restrict) puis Member (les cascades géreront le reste)
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
