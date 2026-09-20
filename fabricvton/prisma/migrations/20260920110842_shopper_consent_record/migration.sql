-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT;

-- AlterTable
ALTER TABLE "TryOnEvent" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT;
