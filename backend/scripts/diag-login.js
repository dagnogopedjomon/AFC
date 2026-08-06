/**
 * Diagnostic login : reproduit exactement AuthService.validateUser()
 *
 * Usage (depuis backend/) :
 *   node scripts/diag-login.js 0600000000 password123
 *   node scripts/diag-login.js +2250600000000 password123
 */
require('dotenv/config');

const phone = (process.argv[2] || '0600000000').trim();
const password = process.argv[3] || 'password123';

function line(title) {
  console.log('\n=== ' + title + ' ===');
}

function fail(step, err) {
  console.error(`\n[ECHEC] ${step}`);
  console.error('name    :', err && err.name);
  console.error('message :', err && err.message);
  if (err && err.code) console.error('code    :', err.code);
  if (err && err.stack) console.error('stack   :\n' + err.stack);
  process.exit(1);
}

function connectionStringWithoutSslQueryParams(connectionString) {
  const q = connectionString.indexOf('?');
  if (q === -1) return connectionString;
  const base = connectionString.slice(0, q);
  const params = new URLSearchParams(connectionString.slice(q + 1));
  params.delete('sslmode');
  params.delete('uselibpqcompat');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

function phoneLookupCandidates(input) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set();

  if (trimmed) candidates.add(trimmed);
  if (digits) candidates.add(digits);

  if (digits.length === 10) {
    candidates.add('0' + digits.slice(-9));
    candidates.add('+225' + digits);
    candidates.add('225' + digits);
  } else if (digits.startsWith('225') && digits.length >= 11) {
    const local = digits.slice(3);
    candidates.add(local);
    candidates.add('+' + digits);
    candidates.add('+225' + local);
    candidates.add('225' + local);
  }

  return [...candidates];
}

(async () => {
  line('1. Variables d environnement');
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    console.log(`${key} :`, process.env[key] ? 'présent' : '*** MANQUANT ***');
  }
  console.log('NODE_ENV   :', process.env.NODE_ENV || '(non défini)');
  console.log('API_PREFIX :', process.env.API_PREFIX || '(non défini)');
  console.log('node       :', process.version);
  if (!process.env.DATABASE_URL) fail('DATABASE_URL absent', new Error('DATABASE_URL manquant'));

  line('2. Chargement des modules');
  let PrismaClient, PrismaPg, Pool, bcrypt;
  try {
    ({ PrismaClient } = require('@prisma/client'));
    console.log('@prisma/client        : OK');
  } catch (e) { fail('require @prisma/client', e); }
  try {
    ({ PrismaPg } = require('@prisma/adapter-pg'));
    console.log('@prisma/adapter-pg    : OK');
  } catch (e) { fail('require @prisma/adapter-pg', e); }
  try {
    ({ Pool } = require('pg'));
    console.log('pg                    : OK');
  } catch (e) { fail('require pg', e); }
  try {
    bcrypt = require('bcrypt');
    console.log('bcrypt (natif)        : OK');
  } catch (e) { fail('require bcrypt (module natif mal compilé ?)', e); }

  line('3. Connexion base de données');
  let prisma;
  try {
    const trimmed = process.env.DATABASE_URL.trim();
    const isSupabase = /supabase\.co/i.test(trimmed) || /\.pooler\.supabase\.com/i.test(trimmed);
    let adapter;
    if (isSupabase || process.env.DATABASE_SSL_INSECURE === 'true') {
      const pool = new Pool({
        connectionString: connectionStringWithoutSslQueryParams(trimmed),
        ssl: { rejectUnauthorized: false },
      });
      adapter = new PrismaPg(pool);
      console.log('mode adapter : pool pg + ssl relâché');
    } else {
      adapter = new PrismaPg({ connectionString: trimmed });
      console.log('mode adapter : PrismaPg direct');
    }
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    console.log('connexion    : OK');
  } catch (e) { fail('connexion Prisma', e); }

  line('4. Candidats de téléphone');
  const candidates = phoneLookupCandidates(phone);
  console.log('input        :', phone);
  console.log('candidates   :', candidates);

  line('5. Recherche du membre (findFirst avec candidates)');
  let member;
  try {
    member = await prisma.member.findFirst({
      where: { phone: { in: candidates } },
    });
    console.log('trouvé       :', member ? 'OUI' : 'NON');
    if (member) {
      console.log('id           :', member.id);
      console.log('phone        :', member.phone);
      console.log('role         :', member.role);
      console.log('isSuspended  :', member.isSuspended);
      console.log('passwordHash :', member.passwordHash ? 'présent' : 'ABSENT');
    }
  } catch (e) { fail('prisma.member.findFirst', e); }

  if (!member) {
    line('RESULTAT');
    console.log(`Aucun membre avec les téléphones candidats pour "${phone}".`);
    const all = await prisma.member.findMany({ select: { phone: true, role: true }, take: 20 });
    console.log('Numéros existants en base (20 max) :');
    all.forEach((m) => console.log('  -', m.phone, '/', m.role));
    console.log('\n=> Le login renverrait 401 (membre non trouvé).');
    await prisma.$disconnect();
    return;
  }

  if (!member.passwordHash) {
    line('RESULTAT');
    console.log('Membre trouvé mais passwordHash est absent.');
    console.log('=> Le login renverrait 401 (compte non activé).');
    await prisma.$disconnect();
    return;
  }

  line('6. Vérification du mot de passe (bcrypt.compare)');
  let ok = false;
  try {
    ok = await bcrypt.compare(password, member.passwordHash);
    console.log('compare      : OK');
    console.log('mot de passe :', ok ? 'CORRECT' : 'INCORRECT');
  } catch (e) { fail('bcrypt.compare', e); }

  line('RESULTAT');
  console.log(ok ? '=> Le login devrait réussir (200).' : '=> Le login renverrait 401 (mauvais mot de passe).');

  await prisma.$disconnect();
})().catch((e) => fail('erreur inattendue', e));
