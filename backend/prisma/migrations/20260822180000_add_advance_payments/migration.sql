ALTER TABLE "PendingJekoPayment" ADD COLUMN "advanceMonths" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "cancelledById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "cancellationReason" TEXT;
CREATE INDEX "Payment_cancelledAt_idx" ON "Payment"("cancelledAt");
