import 'dotenv/config';
import { PrismaClient, Role, ContributionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = '0600000000';

  const existing = await prisma.member.findUnique({ where: { phone } });
  const passwordHash = await bcrypt.hash('password123', 10);
  let adminId: string;

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
  } else {
    const created = await prisma.member.create({
      data: {
        phone,
        passwordHash,
        firstName: 'Admin',
        lastName: 'AFC',
        role: Role.ADMIN,
        profileCompleted: true,
        isSuspended: false,
        profilePhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC',
      },
    });
    adminId = created.id;
    console.log('Compte Admin créé. Connexion: 0600000000 / password123');
  }

  const monthly = await prisma.contribution.findFirst({
    where: { type: ContributionType.MONTHLY },
  });
  if (monthly && monthly.amount != null) {
    const now = new Date();
    const amount = monthly.amount;
    const y = now.getFullYear();
    const m = now.getMonth() + 1; // 1-12
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const periods: { year: number; month: number }[] = [
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
