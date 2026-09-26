-- Signing out of the portal revokes every session issued before it.
ALTER TABLE "Account" ADD COLUMN "sessionsRevokedAt" TIMESTAMP(3);
