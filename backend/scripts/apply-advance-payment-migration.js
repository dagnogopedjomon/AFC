require('dotenv').config();
const { Pool } = require('pg');
const { createHash, randomUUID } = require('crypto');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const migrationName = '20260822180000_add_advance_payments';
const migrationPath = resolve(__dirname, '..', 'prisma', 'migrations', migrationName, 'migration.sql');
const sql = readFileSync(migrationPath, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, ''), ssl: { rejectUnauthorized: false }, max: 1 });
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT "finished_at" FROM "_prisma_migrations" WHERE "migration_name" = $1 AND "rolled_back_at" IS NULL', [migrationName]);
    if (existing.rowCount > 0 && existing.rows[0].finished_at) return console.log('✅ Migration déjà appliquée.');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`, [randomUUID(), checksum, migrationName]);
    await client.query('COMMIT');
    console.log('✅ Migration des paiements anticipés appliquée et enregistrée.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration annulée :', error.message);
    process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
})().catch((error) => { console.error('❌ Erreur :', error.message); process.exit(1); });
