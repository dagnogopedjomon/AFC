-- CreateEnum
CREATE TYPE "CashBoxTransferType" AS ENUM ('ALLOCATION', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "CashBox" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CashBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBoxTransfer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "CashBoxTransferType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "fromCashBoxId" TEXT,
    "toCashBoxId" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_TREASURER',
    "requestedById" TEXT NOT NULL,
    "treasurerApprovedById" TEXT,
    "treasurerApprovedAt" TIMESTAMP(3),
    "commissionerApprovedById" TEXT,
    "commissionerApprovedAt" TIMESTAMP(3),
    "rejectReason" TEXT,

    CONSTRAINT "CashBoxTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cinetpay_transactions" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "contribution_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "period_year" INTEGER,
    "period_month" INTEGER,
    "cash_box_id" TEXT,
    "cinetpay_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cinetpay_transactions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cashBoxId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "cashBoxId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "beneficiary" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cinetpay_transactions_transaction_id_key" ON "cinetpay_transactions"("transaction_id");
CREATE INDEX "cinetpay_transactions_transaction_id_idx" ON "cinetpay_transactions"("transaction_id");
CREATE INDEX "cinetpay_transactions_member_id_idx" ON "cinetpay_transactions"("member_id");
CREATE INDEX "CashBox_order_idx" ON "CashBox"("order");
CREATE INDEX "CashBoxTransfer_fromCashBoxId_idx" ON "CashBoxTransfer"("fromCashBoxId");
CREATE INDEX "CashBoxTransfer_toCashBoxId_idx" ON "CashBoxTransfer"("toCashBoxId");
CREATE INDEX "CashBoxTransfer_status_idx" ON "CashBoxTransfer"("status");
CREATE INDEX "Payment_cashBoxId_idx" ON "Payment"("cashBoxId");
CREATE INDEX "Expense_cashBoxId_idx" ON "Expense"("cashBoxId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashBoxId_fkey" FOREIGN KEY ("cashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cashBoxId_fkey" FOREIGN KEY ("cashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashBoxTransfer" ADD CONSTRAINT "CashBoxTransfer_fromCashBoxId_fkey" FOREIGN KEY ("fromCashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashBoxTransfer" ADD CONSTRAINT "CashBoxTransfer_toCashBoxId_fkey" FOREIGN KEY ("toCashBoxId") REFERENCES "CashBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashBoxTransfer" ADD CONSTRAINT "CashBoxTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashBoxTransfer" ADD CONSTRAINT "CashBoxTransfer_treasurerApprovedById_fkey" FOREIGN KEY ("treasurerApprovedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashBoxTransfer" ADD CONSTRAINT "CashBoxTransfer_commissionerApprovedById_fkey" FOREIGN KEY ("commissionerApprovedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cinetpay_transactions" ADD CONSTRAINT "cinetpay_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
