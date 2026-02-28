import 'dotenv/config';
import { PrismaClient, Role, ContributionType, PaymentFrequency } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Accepter le certificat Supabase en local (évite "self-signed certificate in certificate chain")
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = '0600000000';
  const existing = await prisma.member.findUnique({ where: { phone } });
  if (existing) {
    await prisma.member.update({
      where: { phone },
      data: { profileCompleted: false },
    });
    console.log('Compte Admin existant : profil mis à "non complété" pour tester la redirection.');
  } else {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.member.create({
      data: {
        phone,
        passwordHash,
        firstName: 'Admin',
        lastName: 'AFC',
        role: Role.ADMIN,
        profileCompleted: false,
        profilePhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC',
      },
    });
    console.log('Compte Admin créé. Connexion: 0600000000 / password123 — première connexion → Compléter mon profil.');
  }

  const monthlyExists = await prisma.contribution.findFirst({
    where: { type: ContributionType.MONTHLY },
  });
  if (!monthlyExists) {
    await prisma.contribution.create({
      data: {
        name: 'Cotisation mensuelle',
        type: ContributionType.MONTHLY,
        amount: 5000,
        frequency: PaymentFrequency.MONTHLY,
      },
    });
    console.log('Cotisation mensuelle par défaut créée (5 000 FCFA/mois, échéance 10).');
  }

  const defaultBox = await prisma.cashBox.findFirst({ where: { isDefault: true } });
  if (!defaultBox) {
    await prisma.cashBox.create({
      data: {
        name: 'Caisse principale',
        description: 'Caisse par défaut (entrées et sorties non affectées à une sous-caisse)',
        order: 0,
        isDefault: true,
      },
    });
    console.log('Sous-caisse par défaut "Caisse principale" créée.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().then(() => pool.end()).then(() => process.exit(1));
  });
