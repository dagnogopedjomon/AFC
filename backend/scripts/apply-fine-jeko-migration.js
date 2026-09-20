// Script ponctuel : paiement des amendes via Jeko (PendingJekoPayment.fineId)
// Usage: node -r dotenv/config scripts/apply-fine-jeko-migration.js
const { Pool } = require('pg');

const sql = `
ALTER TABLE "PendingJekoPayment" ALTER COLUMN "contributionId" DROP NOT NULL;
ALTER TABLE "PendingJekoPayment" ADD COLUMN IF NOT EXISTS "fineId" TEXT;
CREATE INDEX IF NOT EXISTS "PendingJekoPayment_fineId_idx" ON "PendingJekoPayment"("fineId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PendingJekoPayment_fineId_fkey'
    ) THEN
        ALTER TABLE "PendingJekoPayment"
        ADD CONSTRAINT "PendingJekoPayment_fineId_fkey"
        FOREIGN KEY ("fineId") REFERENCES "Fine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
`;

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL manquant');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url.replace(/[?&]sslmode=[^&]+/g, ''),
    ssl: { rejectUnauthorized: false },
  });
  try {
    console.log('Connexion à la base...');
    await pool.query('SELECT 1');
    console.log('Application de la migration amendes/Jeko...');
    await pool.query(sql);
    console.log('Migration appliquée avec succès');
  } catch (e) {
    console.error('Erreur:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
