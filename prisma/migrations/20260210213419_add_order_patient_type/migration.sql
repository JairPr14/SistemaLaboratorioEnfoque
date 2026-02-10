-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "patientType" TEXT;

-- CreateIndex
CREATE INDEX "LabOrder_patientType_idx" ON "LabOrder"("patientType");
