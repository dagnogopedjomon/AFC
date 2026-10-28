-- Lot 3 du module « Publications » : articles du blog du club.
-- Version rejouable, à appliquer avec Prisma (qui gère le certificat Supabase) :
--   npx prisma db execute --file prisma/sql/20261028_publications_lot3.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleCategory') THEN
        CREATE TYPE "ArticleCategory" AS ENUM ('VIE_DU_CLUB', 'REGLES', 'COMMUNIQUES', 'COMPTES_RENDUS');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Article" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL DEFAULT 'VIE_DU_CLUB',
    "authorName" TEXT,
    "coverUrl" TEXT,
    "coverAlt" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Article_slug_key" ON "Article"("slug");

CREATE INDEX IF NOT EXISTS "Article_publicationStatus_publishedAt_idx"
    ON "Article"("publicationStatus", "publishedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Article_createdById_fkey'
    ) THEN
        ALTER TABLE "Article"
            ADD CONSTRAINT "Article_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "Member"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
