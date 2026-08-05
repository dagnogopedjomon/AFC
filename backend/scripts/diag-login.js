/**
 * Diagnostic login : reproduit pas à pas ce que fait AuthService.login()
 * et affiche l'erreur réelle (stack complète) à chaque étape.
 *
 * Usage (depuis backend/) :
 *   node scripts/diag-login.js 0600000000 password123
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
  let PrismaClient, PrismaPg, Pool, bcrypt, jwt;
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
  try {
    jwt = require('jsonwebtoken');
    console.log('jsonwebtoken          : OK');
  } catch (e) { fail('require jsonwebtoken', e); }

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

  line('4. Recherche du membre (findUnique sur phone)');
  let member;
  try {
    member = await prisma.member.findUnique({ where: { phone } });
    console.log('recherche    : OK');
    console.log('trouvé       :', member ? 'oui' : 'NON');
    if (member) {
      console.log('id           :', member.id);
      console.log('role         :', member.role);
      console.log('isSuspended  :', member.isSuspended);
      console.log('passwordHash :', member.passwordHash ? 'présent' : 'ABSENT (compte non activé)');
    }
  } catch (e) { fail('prisma.member.findUnique', e); }

  if (!member) {
    line('RESULTAT');
    console.log(`Aucun membre avec le téléphone "${phone}".`);
    const all = await prisma.member.findMany({ select: { phone: true, role: true }, take: 20 });
    console.log('Numéros existants en base (20 max) :');
    all.forEach((m) => console.log('  -', m.phone, '/', m.role));
    console.log('\n=> Le login renverrait 401, pas 500.');
    await prisma.$disconnect();
    return;
  }

  line('5. Vérification du mot de passe (bcrypt.compare)');
  let ok = false;
  try {
    ok = await bcrypt.compare(password, member.passwordHash);
    console.log('compare      : OK');
    console.log('mot de passe :', ok ? 'CORRECT' : 'INCORRECT');
  } catch (e) { fail('bcrypt.compare', e); }

  line('6. Signature du JWT');
  try {
    const token = jwt.sign(
      { sub: member.id, phone: member.phone, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    console.log('signature    : OK');
    console.log('token (début):', token.slice(0, 32) + '...');
  } catch (e) { fail('jwt.sign', e); }

  line('RESULTAT');
  console.log('Toutes les étapes du login fonctionnent.');
  console.log('Statut attendu :', ok ? '200 (connexion réussie)' : '401 (mot de passe incorrect)');
  console.log('\nSi l API renvoie quand même 500, le problème est ailleurs');
  console.log('(build dist obsolète, ou app non redémarrée).');

  await prisma.$disconnect();
})().catch((e) => fail('erreur inattendue', e));
