require('dotenv').config();
const { Pool } = require('pg');

const memberId = process.argv[2];
const calendarYear = Number(process.argv[3]);

if (!memberId || !Number.isInteger(calendarYear)) {
  console.error('Usage : node scripts/reallocate-annual-payment.js <memberId> <année>');
  process.exit(1);
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, ''),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const latest = await client.query(
      `SELECT metadata::jsonb->>'batchReference' AS "batchReference"
       FROM "Payment"
       WHERE "memberId" = $1 AND "cancelledAt" IS NULL
         AND metadata::jsonb->>'source' = 'external_admin'
         AND metadata::jsonb->>'advancePayment' = 'true'
       ORDER BY "paidAt" DESC LIMIT 1`,
      [memberId],
    );
    const batchReference = latest.rows[0]?.batchReference;
    if (!batchReference) throw new Error('Aucun paiement annuel hors application trouvé pour ce membre.');

    const batch = await client.query(
      `SELECT id FROM "Payment"
       WHERE "memberId" = $1 AND "cancelledAt" IS NULL
         AND metadata::jsonb->>'batchReference' = $2
       ORDER BY "periodYear", "periodMonth" FOR UPDATE`,
      [memberId, batchReference],
    );
    if (batch.rowCount !== 12) throw new Error(`Le lot contient ${batch.rowCount} paiement(s), 12 attendus.`);

    const ids = batch.rows.map((row) => row.id);
    const duplicate = await client.query(
      `SELECT id FROM "Payment"
       WHERE "memberId" = $1 AND "cancelledAt" IS NULL
         AND "periodYear" = $2 AND "periodMonth" BETWEEN 1 AND 12
         AND NOT (id = ANY($3::text[])) LIMIT 1`,
      [memberId, calendarYear, ids],
    );
    if (duplicate.rowCount) throw new Error(`Un autre paiement existe déjà pour ${calendarYear}.`);

    for (let index = 0; index < ids.length; index++) {
      await client.query(
        `UPDATE "Payment" SET "periodYear" = $1::int, "periodMonth" = $2::int,
          metadata = (metadata::jsonb || jsonb_build_object('calendarYear', $1::int, 'reallocatedAnnualPayment', true))::text
         WHERE id = $3`,
        [calendarYear, index + 1, ids[index]],
      );
    }
    await client.query('COMMIT');
    console.log(`✅ Paiement réaffecté de janvier à décembre ${calendarYear}, sans nouvel encaissement.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Réaffectation annulée :', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error('❌ Erreur :', error.message);
  process.exit(1);
});
