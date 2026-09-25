-- AlterTable
ALTER TABLE "ShopConfig" ADD COLUMN     "cycleTopUpCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditInvoice" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "internalNote" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "creditsAppliedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditInvoice_razorpayOrderId_key" ON "CreditInvoice"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "CreditInvoice_shop_status_idx" ON "CreditInvoice"("shop", "status");

-- CreateIndex
CREATE INDEX "CreditInvoice_status_createdAt_idx" ON "CreditInvoice"("status", "createdAt");
