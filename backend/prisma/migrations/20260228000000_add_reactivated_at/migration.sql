-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "reactivatedAt" TIMESTAMP(3);
