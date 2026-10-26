-- Lot 1 du module « Publications » : publication des événements sur le site public.
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Activity" ADD COLUMN "location" TEXT;
ALTER TABLE "Activity" ADD COLUMN "slug" TEXT;
ALTER TABLE "Activity" ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Activity" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "albumVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN "coverPhotoId" TEXT;

CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

ALTER TABLE "Photo" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Photo" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
