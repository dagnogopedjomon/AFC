-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('OPEN', 'CLOSED_PENDING', 'CLOSED_DELIVERED');

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN "isOpenAmount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deadline" TIMESTAMP(3),
ADD COLUMN "targetMemberIds" TEXT,
ADD COLUMN "beneficiaryMemberId" TEXT,
ADD COLUMN "status" "ContributionStatus" NOT NULL DEFAULT 'OPEN';

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_beneficiaryMemberId_fkey" FOREIGN KEY ("beneficiaryMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Contribution_beneficiaryMemberId_idx" ON "Contribution"("beneficiaryMemberId");
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateTable
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

-- AddForeignKey
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_fromCashBoxId_fkey" FOREIGN KEY ("fromCashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ContributionAllocation_contributionId_idx" ON "ContributionAllocation"("contributionId");
CREATE INDEX "ContributionAllocation_fromCashBoxId_idx" ON "ContributionAllocation"("fromCashBoxId");
