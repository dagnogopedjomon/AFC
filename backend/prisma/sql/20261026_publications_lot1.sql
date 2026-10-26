-- Lot 1 du module « Publications » : publication des événements sur le site public.
-- Version rejouable, à appliquer avec Prisma (qui gère le certificat Supabase) :
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/20261026_publications_lot1.sql
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
