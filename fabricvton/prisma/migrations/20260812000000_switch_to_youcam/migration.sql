-- Switch the try-on provider from GenLook to YouCam (Perfect Corp AI Clothes).
-- Renames preserve existing rows so historical analytics stay intact.

-- TryOnEvent: genlookGenId → providerTaskId
ALTER TABLE "TryOnEvent" RENAME COLUMN "genlookGenId" TO "providerTaskId";
ALTER INDEX "TryOnEvent_genlookGenId_idx" RENAME TO "TryOnEvent_providerTaskId_idx";

-- TryOnEvent: record the provider's stable error code alongside the message
ALTER TABLE "TryOnEvent" ADD COLUMN "errorCode" TEXT;

-- TryOnEvent: new rows default to the YouCam engine
ALTER TABLE "TryOnEvent" ALTER COLUMN "modelUsed" SET DEFAULT 'youcam/cloth-v4';

-- ShopConfig: new installs default to YouCam
ALTER TABLE "ShopConfig" ALTER COLUMN "modelProvider" SET DEFAULT 'youcam';
ALTER TABLE "ShopConfig" ALTER COLUMN "modelVersion" SET DEFAULT 'cloth-v4';

-- Move existing shops off the retired GenLook provider
UPDATE "ShopConfig"
SET "modelProvider" = 'youcam', "modelVersion" = 'cloth-v4'
WHERE "modelProvider" = 'genlook';
