-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ADMISION', 'LABORATORIO');

-- AlterTable: Add new columns to LabOrder
ALTER TABLE "LabOrder" ADD COLUMN "orderSource" "OrderSource" NOT NULL DEFAULT 'LABORATORIO';
ALTER TABLE "LabOrder" ADD COLUMN "createdById" TEXT;

-- Migrate: Set orderSource = ADMISION where admissionRequestId is not null
UPDATE "LabOrder" SET "orderSource" = 'ADMISION' WHERE "admissionRequestId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "LabOrder" DROP CONSTRAINT IF EXISTS "LabOrder_admissionRequestId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "LabOrder_admissionRequestId_key";

-- AlterTable: Remove admissionRequestId
ALTER TABLE "LabOrder" DROP COLUMN "admissionRequestId";

-- CreateIndex
CREATE INDEX "LabOrder_orderSource_idx" ON "LabOrder"("orderSource");

-- DropTable: AdmissionRequestItem (references AdmissionRequest)
DROP TABLE IF EXISTS "AdmissionRequestItem";

-- DropTable: AdmissionRequest
DROP TABLE IF EXISTS "AdmissionRequest";
