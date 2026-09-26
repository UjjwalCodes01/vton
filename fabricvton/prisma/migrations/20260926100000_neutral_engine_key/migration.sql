-- Neutral names for the try-on engine in stored defaults and settings.
ALTER TABLE "ShopConfig" ALTER COLUMN "modelProvider" SET DEFAULT 'primary';
UPDATE "ShopConfig" SET "modelProvider" = 'primary' WHERE "modelProvider" <> 'custom';
ALTER TABLE "TryOnEvent" ALTER COLUMN "modelUsed" SET DEFAULT 'primary/cloth-v4';
