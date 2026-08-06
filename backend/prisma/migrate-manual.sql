-- Manual migration for cPanel (Prisma deploy killed by SIGTERM)
-- Apply with: psql "$DATABASE_URL" -f /home/agboloci/afc-backend/backend/prisma/migrate-manual.sql

-- 1) Create PendingJekoPayment (20260525000000_add_pending_jeko_payment)
CREATE TABLE "PendingJekoPayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "jekoRequestId" TEXT,
    "memberId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "cashBoxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingJekoPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingJekoPayment_reference_key" ON "PendingJekoPayment"("reference");
CREATE INDEX "PendingJekoPayment_reference_idx" ON "PendingJekoPayment"("reference");
CREATE INDEX "PendingJekoPayment_expiresAt_idx" ON "PendingJekoPayment"("expiresAt");

ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Add jekoLinkId (20250628000000_add_jeko_link_id)
ALTER TABLE "PendingJekoPayment" ADD COLUMN "jekoLinkId" TEXT;

-- 3) Exceptional contribution enhancements (20250628200000_exceptional_contribution_enhancements)
CREATE TYPE "ContributionStatus" AS ENUM ('OPEN', 'CLOSED_PENDING', 'CLOSED_DELIVERED');

ALTER TABLE "Contribution" ADD COLUMN "isOpenAmount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deadline" TIMESTAMP(3),
ADD COLUMN "targetMemberIds" TEXT,
ADD COLUMN "beneficiaryMemberId" TEXT,
ADD COLUMN "status" "ContributionStatus" NOT NULL DEFAULT 'OPEN';

ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_beneficiaryMemberId_fkey" FOREIGN KEY ("beneficiaryMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Contribution_beneficiaryMemberId_idx" ON "Contribution"("beneficiaryMemberId");
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

CREATE TABLE "ContributionAllocation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionId" TEXT NOT NULL,
    "fromCashBoxId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "performedById" TEXT,

    CONSTRAINT "ContributionAllocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_fromCashBoxId_fkey" FOREIGN KEY ("fromCashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ContributionAllocation_contributionId_idx" ON "ContributionAllocation"("contributionId");
CREATE INDEX "ContributionAllocation_fromCashBoxId_idx" ON "ContributionAllocation"("fromCashBoxId");

-- Mark all three migrations as applied in _prisma_migrations
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES
  ('4249d95a-1716-4a19-bfd9-868316c564f2', 'c946286ea3800e8d4aad47ecc8dc59e11712b34a5ff85b3be009f11552d37977', NOW(), '20260525000000_add_pending_jeko_payment', '', NULL, NOW(), 1),
  ('4594232b-c430-407e-b30b-e16a18af4ee3', 'f701884fe085062ccbed54b8a050e59672690793330fcf03a30931d90444ac75', NOW(), '20250628000000_add_jeko_link_id', '', NULL, NOW(), 1),
  ('1fab3730-5845-4ebb-b7ef-5ccc8616e376', '2b9ea52c844aec175f9e1473daf33d0f54d39fdec0581386b34ae84d0c13592c', NOW(), '20250628200000_exceptional_contribution_enhancements', '', NULL, NOW(), 1);
