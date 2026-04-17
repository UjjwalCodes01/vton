-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopConfig" (
    "id" TEXT NOT NULL,
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
    "billingCycleStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overageChargesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "klaviyoApiKey" TEXT,
    "klaviyoListId" TEXT,
    "modelProvider" TEXT NOT NULL DEFAULT 'genlook',
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "source" TEXT NOT NULL DEFAULT 'tryon_widget',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryOnEvent" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TryOnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "widgetOpens" INTEGER NOT NULL DEFAULT 0,
    "emailsCaptured" INTEGER NOT NULL DEFAULT 0,
    "tryOnsCompleted" INTEGER NOT NULL DEFAULT 0,
    "tryOnsFailed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminShop" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetShop" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopConfig_shop_key" ON "ShopConfig"("shop");

-- CreateIndex
CREATE INDEX "Lead_shop_idx" ON "Lead"("shop");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_shop_email_idx" ON "Lead"("shop", "email");

-- CreateIndex
CREATE INDEX "TryOnEvent_shop_idx" ON "TryOnEvent"("shop");

-- CreateIndex
CREATE INDEX "TryOnEvent_createdAt_idx" ON "TryOnEvent"("createdAt");

-- CreateIndex
CREATE INDEX "TryOnEvent_genlookGenId_idx" ON "TryOnEvent"("genlookGenId");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_shop_idx" ON "AnalyticsDaily"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDaily_shop_date_key" ON "AnalyticsDaily"("shop", "date");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminShop_idx" ON "AdminAuditLog"("adminShop");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetShop_idx" ON "AdminAuditLog"("targetShop");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

