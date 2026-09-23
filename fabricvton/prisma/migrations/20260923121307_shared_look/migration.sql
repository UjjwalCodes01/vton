-- CreateTable
CREATE TABLE "SharedLook" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "generationId" TEXT,
    "imageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "productTitle" TEXT,
    "productUrl" TEXT,
    "productImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedLook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedLook_expiresAt_idx" ON "SharedLook"("expiresAt");

-- CreateIndex
CREATE INDEX "SharedLook_shop_idx" ON "SharedLook"("shop");
