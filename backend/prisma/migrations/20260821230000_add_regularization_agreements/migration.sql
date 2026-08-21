CREATE TYPE "RegularizationMode" AS ENUM ('INSTALLMENT', 'SETTLEMENT');
CREATE TYPE "RegularizationStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'COMPLETED', 'OVERDUE', 'CANCELLED');

CREATE TABLE "RegularizationAgreement" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "memberId" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "mode" "RegularizationMode" NOT NULL,
  "status" "RegularizationStatus" NOT NULL DEFAULT 'PENDING',
  "originalAmount" DECIMAL(12,2) NOT NULL,
  "agreedAmount" DECIMAL(12,2) NOT NULL,
  "initialAmount" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "months" JSONB NOT NULL,
  "notes" TEXT,
  "activatedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "RegularizationAgreement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD COLUMN "regularizationAgreementId" TEXT;
ALTER TABLE "PendingJekoPayment" ADD COLUMN "regularizationAgreementId" TEXT;

CREATE INDEX "RegularizationAgreement_memberId_status_idx" ON "RegularizationAgreement"("memberId", "status");
CREATE INDEX "RegularizationAgreement_deadline_status_idx" ON "RegularizationAgreement"("deadline", "status");
CREATE INDEX "Payment_regularizationAgreementId_idx" ON "Payment"("regularizationAgreementId");
CREATE INDEX "PendingJekoPayment_regularizationAgreementId_idx" ON "PendingJekoPayment"("regularizationAgreementId");

ALTER TABLE "RegularizationAgreement" ADD CONSTRAINT "RegularizationAgreement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegularizationAgreement" ADD CONSTRAINT "RegularizationAgreement_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegularizationAgreement" ADD CONSTRAINT "RegularizationAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_regularizationAgreementId_fkey" FOREIGN KEY ("regularizationAgreementId") REFERENCES "RegularizationAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_regularizationAgreementId_fkey" FOREIGN KEY ("regularizationAgreementId") REFERENCES "RegularizationAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
