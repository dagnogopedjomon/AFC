import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const phone = process.argv[2]?.trim();
if (!phone) {
  console.log('Usage: npx ts-node prisma/delete-invite-by-phone.ts <phone>');
  process.exit(1);
}

async function main() {
  const normalized = phone.replace(/\D/g, '');
  const variants = [
    phone,
    normalized,
    normalized.startsWith('0') ? '225' + normalized.slice(1) : null,
    normalized.startsWith('225') ? '0' + normalized.slice(3) : null,
  ].filter(Boolean) as string[];

  const member = await prisma.member.findFirst({
    where: { phone: { in: variants } },
  });
  if (!member) {
    console.log(`Aucun membre trouvé avec le numéro : ${phone}`);
    return;
  }
  await prisma.notificationLog.deleteMany({ where: { memberId: member.id } });
  await prisma.member.delete({ where: { id: member.id } });
  console.log(`Invitation supprimée : ${member.phone} (id: ${member.id}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
