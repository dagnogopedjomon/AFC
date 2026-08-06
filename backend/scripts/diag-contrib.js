/**
 * Diagnostic contributions : reproduit getMemberHistory pour le membre connecté.
 *
 * Usage :
 *   node scripts/diag-contrib.js cmm6pyggt00005b384si9uook
 */
require('dotenv/config');

const { PrismaClient } = require('@prisma/client');

const memberId = process.argv[2] || 'cmm6pyggt00005b384si9uook';

const connectionStringWithoutSslQueryParams = (connectionString) => {
  const q = connectionString.indexOf('?');
  if (q === -1) return connectionString;
  const base = connectionString.slice(0, q);
  const params = new URLSearchParams(connectionString.slice(q + 1));
  params.delete('sslmode');
  params.delete('uselibpqcompat');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
};

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquant');
    process.exit(1);
  }

  const trimmed = process.env.DATABASE_URL.trim();
  const isSupabase = /supabase\.co/i.test(trimmed) || /\.pooler\.supabase\.com/i.test(trimmed);
  let adapter;
  if (isSupabase || process.env.DATABASE_SSL_INSECURE === 'true') {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({
      connectionString: connectionStringWithoutSslQueryParams(trimmed),
      ssl: { rejectUnauthorized: false },
    });
    adapter = new PrismaPg(pool);
  } else {
    const { PrismaPg } = require('@prisma/adapter-pg');
    adapter = new PrismaPg({ connectionString: trimmed });
  }

  const prisma = new PrismaClient({ adapter });

  try {
    console.log('memberId:', memberId);

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, isSuspended: true },
    });
    console.log('member:', member);
    if (!member) throw new Error('Membre introuvable');

    const payments = await prisma.payment.findMany({
      where: { memberId },
      orderBy: { paidAt: 'desc' },
      take: 200,
      include: { contribution: true },
    });
    console.log('payments count:', payments.length);

    const monthly = await prisma.contribution.findFirst({
      where: { type: 'MONTHLY' },
    });
    console.log('monthly:', monthly ? monthly.id : null);

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log('totalPaid:', totalPaid);

    console.log('\n=> getMemberHistory devrait réussir.');
  } catch (e) {
    console.error('\n[ERREUR]', e);
  } finally {
    await prisma.$disconnect();
  }
})();
