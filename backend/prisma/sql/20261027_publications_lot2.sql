-- Lot 2 du module « Publications » : documents téléchargeables sur le site public.
-- Version rejouable, à appliquer avec Prisma (qui gère le certificat Supabase) :
--   npx prisma db execute --file prisma/sql/20261027_publications_lot2.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentCategory') THEN
        CREATE TYPE "DocumentCategory" AS ENUM ('STATUTS', 'REGLEMENT', 'COMPTES_RENDUS', 'AUTRES');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL DEFAULT 'AUTRES',
    "date" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_publicationStatus_category_idx"
    ON "Document"("publicationStatus", "category");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Document_uploadedById_fkey'
    ) THEN
        ALTER TABLE "Document"
            ADD CONSTRAINT "Document_uploadedById_fkey"
            FOREIGN KEY ("uploadedById") REFERENCES "Member"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
