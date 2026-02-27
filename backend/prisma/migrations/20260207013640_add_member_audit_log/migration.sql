-- CreateTable
CREATE TABLE "MemberAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "details" TEXT,

    CONSTRAINT "MemberAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberAuditLog_memberId_idx" ON "MemberAuditLog"("memberId");

-- AddForeignKey
ALTER TABLE "MemberAuditLog" ADD CONSTRAINT "MemberAuditLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAuditLog" ADD CONSTRAINT "MemberAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
