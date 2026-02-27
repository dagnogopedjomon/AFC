import 'dotenv/config';
import { PrismaClient, ContributionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const updated = await prisma.contribution.updateMany({
    where: { type: ContributionType.MONTHLY },
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
