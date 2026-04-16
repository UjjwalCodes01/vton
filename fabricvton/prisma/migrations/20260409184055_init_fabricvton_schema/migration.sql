-- CreateTable
CREATE TABLE "ShopConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "buttonText" TEXT NOT NULL DEFAULT 'Try It On',
    "buttonColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "buttonBorderRadius" TEXT NOT NULL DEFAULT '4px',
    "requireEmailCapture" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "billingId" TEXT,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 25,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "billingCycleStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "klaviyoApiKey" TEXT,
    "klaviyoListId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "source" TEXT NOT NULL DEFAULT 'tryon_widget',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TryOnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "productId" TEXT,
    "productTitle" TEXT,
    "leadEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "modelUsed" TEXT NOT NULL DEFAULT 'replicate/idm-vton',
    "processingMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "widgetOpens" INTEGER NOT NULL DEFAULT 0,
    "emailsCaptured" INTEGER NOT NULL DEFAULT 0,
    "tryOnsCompleted" INTEGER NOT NULL DEFAULT 0,
    "tryOnsFailed" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopConfig_shop_key" ON "ShopConfig"("shop");

-- CreateIndex
CREATE INDEX "Lead_shop_idx" ON "Lead"("shop");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "TryOnEvent_shop_idx" ON "TryOnEvent"("shop");

-- CreateIndex
CREATE INDEX "TryOnEvent_createdAt_idx" ON "TryOnEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_shop_idx" ON "AnalyticsDaily"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDaily_shop_date_key" ON "AnalyticsDaily"("shop", "date");
