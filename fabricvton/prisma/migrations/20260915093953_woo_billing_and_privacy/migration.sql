-- AlterTable
ALTER TABLE "ShopConfig" ADD COLUMN     "disconnectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "providerPlanId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "checkoutToken" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "paymentVerifiedAt" TIMESTAMP(3),
    "currentStart" TIMESTAMP(3),
    "currentEnd" TIMESTAMP(3),
    "cancelAtCycleEnd" BOOLEAN NOT NULL DEFAULT false,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProviderPlan" (
    "key" TEXT NOT NULL,
    "providerPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingProviderPlan_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_checkoutToken_key" ON "BillingSubscription"("checkoutToken");

-- CreateIndex
CREATE INDEX "BillingSubscription_shop_idx" ON "BillingSubscription"("shop");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_receivedAt_idx" ON "BillingWebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "ShopConfig_siteUrl_idx" ON "ShopConfig"("siteUrl");
