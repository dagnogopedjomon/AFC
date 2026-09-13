-- Restrict each account to one active device at a time.
ALTER TABLE "Member" ADD COLUMN "activeDeviceId" TEXT;
