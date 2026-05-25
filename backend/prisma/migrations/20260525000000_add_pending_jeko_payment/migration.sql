-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "PendingJekoPayment_reference_key" ON "PendingJekoPayment"("reference");

-- CreateIndex
CREATE INDEX "PendingJekoPayment_reference_idx" ON "PendingJekoPayment"("reference");

-- CreateIndex
CREATE INDEX "PendingJekoPayment_expiresAt_idx" ON "PendingJekoPayment"("expiresAt");

-- AddForeignKey
ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingJekoPayment" ADD CONSTRAINT "PendingJekoPayment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
