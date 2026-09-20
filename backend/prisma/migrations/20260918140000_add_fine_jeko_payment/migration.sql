-- AlterTable: contributionId devient optionnel, ajout de fineId (paiement d'amende via Jeko)
ALTER TABLE "PendingJekoPayment" ALTER COLUMN "contributionId" DROP NOT NULL;
ALTER TABLE "PendingJekoPayment" ADD COLUMN "fineId" TEXT;

-- CreateIndex
CREATE INDEX "PendingJekoPayment_fineId_idx" ON "PendingJekoPayment"("fineId");

-- AddForeignKey
ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "Fine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
