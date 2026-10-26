// Lot 1 du module « Publications » : publication des événements sur le site public.
// Ajoute le statut de publication, le lieu, l'adresse courte et la couverture sur Activity,
// ainsi que la visibilité et l'ordre sur Photo. Le script est rejouable sans risque.
// Usage sur le serveur : node -r dotenv/config scripts/apply-publications-migration.js
const { Pool } = require('pg');

const sql = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublicationStatus') THEN
        CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    END IF;
END $$;

ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "albumVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "coverPhotoId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Activity_slug_key" ON "Activity"("slug");

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
`;

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL manquant');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(sql);
    console.log('Migration « Publications » appliquée.');
  } catch (err) {
    console.error('Échec de la migration :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
