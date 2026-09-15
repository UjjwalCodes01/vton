-- AlterTable
ALTER TABLE "ShopConfig" ADD COLUMN     "adminEmail" TEXT,
ADD COLUMN     "connectionStatus" TEXT,
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'shopify',
ADD COLUMN     "pluginVersion" TEXT,
ADD COLUMN     "siteSecretEnc" TEXT,
ADD COLUMN     "siteUrl" TEXT,
ADD COLUMN     "siteVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "storeName" TEXT;

-- CreateTable
CREATE TABLE "WooRequestNonce" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WooRequestNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WooRequestNonce_createdAt_idx" ON "WooRequestNonce"("createdAt");

-- CreateIndex
CREATE INDEX "ShopConfig_platform_idx" ON "ShopConfig"("platform");
