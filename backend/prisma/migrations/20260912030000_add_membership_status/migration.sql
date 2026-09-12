-- Track the six-month prospect period independently from the member role.
CREATE TYPE "MembershipStatus" AS ENUM ('PROSPECT', 'ACTIVE');

ALTER TABLE "Member"
  ADD COLUMN "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "membershipStatusManual" BOOLEAN NOT NULL DEFAULT false;

