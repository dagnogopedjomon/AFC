CREATE TYPE "FineStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED');

ALTER TABLE "Expense" ADD COLUMN "note" TEXT;
ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;

CREATE TABLE "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Fine" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "memberId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "FineStatus" NOT NULL DEFAULT 'UNPAID',
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "note" TEXT,
  "cashBoxId" TEXT,
  CONSTRAINT "Fine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Fine_memberId_status_idx" ON "Fine"("memberId", "status");
CREATE INDEX "Fine_createdAt_idx" ON "Fine"("createdAt");
CREATE INDEX "Fine_cashBoxId_idx" ON "Fine"("cashBoxId");
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_cashBoxId_fkey" FOREIGN KEY ("cashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContributionExemption" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "memberId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "reason" TEXT,
  CONSTRAINT "ContributionExemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContributionExemption_memberId_periodYear_periodMonth_key" ON "ContributionExemption"("memberId", "periodYear", "periodMonth");
CREATE INDEX "ContributionExemption_periodYear_periodMonth_idx" ON "ContributionExemption"("periodYear", "periodMonth");
ALTER TABLE "ContributionExemption" ADD CONSTRAINT "ContributionExemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionExemption" ADD CONSTRAINT "ContributionExemption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
