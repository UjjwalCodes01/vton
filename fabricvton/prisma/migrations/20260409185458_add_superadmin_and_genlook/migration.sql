-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminShop" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetShop" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendReason" TEXT,
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
    "overageChargesTotal" REAL NOT NULL DEFAULT 0,
    "klaviyoApiKey" TEXT,
    "klaviyoListId" TEXT,
    "modelProvider" TEXT NOT NULL DEFAULT 'genlook',
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopConfig" ("billingCycleStart", "billingId", "buttonBorderRadius", "buttonColor", "buttonText", "buttonTextColor", "createdAt", "creditsUsed", "id", "isEnabled", "klaviyoApiKey", "klaviyoListId", "monthlyCredits", "plan", "requireEmailCapture", "shop", "updatedAt") SELECT "billingCycleStart", "billingId", "buttonBorderRadius", "buttonColor", "buttonText", "buttonTextColor", "createdAt", "creditsUsed", "id", "isEnabled", "klaviyoApiKey", "klaviyoListId", "monthlyCredits", "plan", "requireEmailCapture", "shop", "updatedAt" FROM "ShopConfig";
DROP TABLE "ShopConfig";
ALTER TABLE "new_ShopConfig" RENAME TO "ShopConfig";
CREATE UNIQUE INDEX "ShopConfig_shop_key" ON "ShopConfig"("shop");
CREATE TABLE "new_TryOnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "productId" TEXT,
    "productTitle" TEXT,
    "leadEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "modelUsed" TEXT NOT NULL DEFAULT 'genlook/v1',
    "processingMs" INTEGER,
    "genlookGenId" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TryOnEvent" ("createdAt", "id", "leadEmail", "modelUsed", "processingMs", "productId", "productTitle", "sessionId", "shop", "status") SELECT "createdAt", "id", "leadEmail", "modelUsed", "processingMs", "productId", "productTitle", "sessionId", "shop", "status" FROM "TryOnEvent";
DROP TABLE "TryOnEvent";
ALTER TABLE "new_TryOnEvent" RENAME TO "TryOnEvent";
CREATE INDEX "TryOnEvent_shop_idx" ON "TryOnEvent"("shop");
CREATE INDEX "TryOnEvent_createdAt_idx" ON "TryOnEvent"("createdAt");
CREATE INDEX "TryOnEvent_genlookGenId_idx" ON "TryOnEvent"("genlookGenId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminShop_idx" ON "AdminAuditLog"("adminShop");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetShop_idx" ON "AdminAuditLog"("targetShop");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_shop_email_idx" ON "Lead"("shop", "email");
