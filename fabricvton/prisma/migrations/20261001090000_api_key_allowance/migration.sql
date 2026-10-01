-- API keys can carry their own try-on allowance, issued from the admin dashboard.
ALTER TABLE "AccountApiKey" ADD COLUMN "credits" INTEGER;
ALTER TABLE "AccountApiKey" ADD COLUMN "issuedBy" TEXT NOT NULL DEFAULT 'self';
ALTER TABLE "AccountApiKey" ADD COLUMN "note" TEXT;
-- Which key's allowance paid for a try-on, so refunds return to it.
ALTER TABLE "TryOnEvent" ADD COLUMN "creditKeyId" TEXT;
