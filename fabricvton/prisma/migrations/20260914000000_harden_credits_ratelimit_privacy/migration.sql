-- Atomic credit/overage reservation ------------------------------------------
ALTER TABLE "ShopConfig" ADD COLUMN "overageReserved" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "TryOnEvent" ADD COLUMN "overageAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "TryOnEvent_shop_providerTaskId_idx" ON "TryOnEvent"("shop", "providerTaskId");
CREATE INDEX "TryOnEvent_shop_status_idx" ON "TryOnEvent"("shop", "status");

-- Rate limiting ---------------------------------------------------------------
CREATE TABLE "RateLimitWindow" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "windowStartMs" BIGINT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitWindow_scope_windowStartMs_key" ON "RateLimitWindow"("scope", "windowStartMs");
CREATE INDEX "RateLimitWindow_windowStartMs_idx" ON "RateLimitWindow"("windowStartMs");

-- GDPR customer data requests -----------------------------------------------
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'customer_data_request',
    "customerId" TEXT,
    "customerEmail" TEXT,
    "orderIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "exportJson" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "deliveredTo" TEXT,
    "deliveredBy" TEXT,
    "note" TEXT,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_shop_idx" ON "PrivacyRequest"("shop");
CREATE INDEX "PrivacyRequest_shop_status_idx" ON "PrivacyRequest"("shop", "status");
CREATE INDEX "PrivacyRequest_requestedAt_idx" ON "PrivacyRequest"("requestedAt");
