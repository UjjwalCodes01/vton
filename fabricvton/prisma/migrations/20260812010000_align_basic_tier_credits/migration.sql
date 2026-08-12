-- Align the entry ("Basic") tier allowance with PLANS[free].credits in
-- app/billing.server.ts. The old default of 25 disagreed with the 10 shown on the
-- billing page, so the dashboard and billing page reported different allowances
-- for the same shop.

ALTER TABLE "ShopConfig" ALTER COLUMN "monthlyCredits" SET DEFAULT 10;

-- Correct existing entry-tier shops that were created with the old default.
-- Paid plans are left untouched: their allowance is set from the plan on sync.
UPDATE "ShopConfig"
SET "monthlyCredits" = 10
WHERE "plan" = 'free' AND "monthlyCredits" = 25;
