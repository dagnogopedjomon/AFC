import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const phone = (process.env.ADMIN_PHONE || '0600000000').trim();
const password = process.env.ADMIN_PASSWORD || 'password123';
const firstName = (process.env.ADMIN_FIRST_NAME || 'Admin').trim();
const lastName = (process.env.ADMIN_LAST_NAME || 'AFC').trim();
const profilePhotoUrl = process.env.ADMIN_PROFILE_PHOTO_URL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=AFC';
const profileCompleted = process.env.ADMIN_PROFILE_COMPLETED === 'true';
const isSuspended = process.env.ADMIN_IS_SUSPENDED === 'true';

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.member.findUnique({ where: { phone } });

  if (existing) {
    const updated = await prisma.member.update({
      where: { phone },
      data: {
        passwordHash,
        firstName,
        lastName,
        role: Role.ADMIN,
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
  } else {
    const created = await prisma.member.create({
      data: {
        phone,
        passwordHash,
        firstName,
        lastName,
        role: Role.ADMIN,
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
