-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "googleSub" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountStore" (
    "accountId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "via" TEXT NOT NULL DEFAULT 'shopify',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountStore_pkey" PRIMARY KEY ("accountId","shop")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_googleSub_key" ON "Account"("googleSub");

-- CreateIndex
CREATE INDEX "Account_googleSub_idx" ON "Account"("googleSub");

-- CreateIndex
CREATE INDEX "AccountStore_shop_idx" ON "AccountStore"("shop");

-- AddForeignKey
ALTER TABLE "AccountStore" ADD CONSTRAINT "AccountStore_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
