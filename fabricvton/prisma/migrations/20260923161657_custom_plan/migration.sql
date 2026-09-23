-- AlterTable
ALTER TABLE "ShopConfig" ADD COLUMN     "customCredits" INTEGER,
ADD COLUMN     "customNote" TEXT,
ADD COLUMN     "customPlanLabel" TEXT,
ADD COLUMN     "customSetAt" TIMESTAMP(3),
ADD COLUMN     "customSetBy" TEXT;
