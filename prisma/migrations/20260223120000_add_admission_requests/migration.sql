-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('PENDIENTE', 'CONVERTIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "AdmissionRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedBy" TEXT,
    "notes" TEXT,
    "patientType" "OrderPatientType",
    "branchId" TEXT,
    "createdById" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "convertedOrderId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionRequestItem" (
    "id" TEXT NOT NULL,
    "admissionRequestId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "priceBase" DOUBLE PRECISION NOT NULL,
    "priceApplied" DOUBLE PRECISION NOT NULL,
    "adjustmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionRequestItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "admissionRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRequest_requestCode_key" ON "AdmissionRequest"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRequest_convertedOrderId_key" ON "AdmissionRequest"("convertedOrderId");

-- CreateIndex
CREATE INDEX "AdmissionRequest_status_idx" ON "AdmissionRequest"("status");

-- CreateIndex
CREATE INDEX "AdmissionRequest_createdAt_idx" ON "AdmissionRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AdmissionRequest_patientId_idx" ON "AdmissionRequest"("patientId");

-- CreateIndex
CREATE INDEX "AdmissionRequest_branchId_idx" ON "AdmissionRequest"("branchId");

-- CreateIndex
CREATE INDEX "AdmissionRequestItem_admissionRequestId_idx" ON "AdmissionRequestItem"("admissionRequestId");

-- CreateIndex
CREATE INDEX "AdmissionRequestItem_labTestId_idx" ON "AdmissionRequestItem"("labTestId");

-- CreateIndex
CREATE UNIQUE INDEX "LabOrder_admissionRequestId_key" ON "LabOrder"("admissionRequestId");

-- CreateIndex
CREATE INDEX "LabOrder_admissionRequestId_idx" ON "LabOrder"("admissionRequestId");

-- AddForeignKey
ALTER TABLE "AdmissionRequest" ADD CONSTRAINT "AdmissionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequest" ADD CONSTRAINT "AdmissionRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequest" ADD CONSTRAINT "AdmissionRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequest" ADD CONSTRAINT "AdmissionRequest_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequestItem" ADD CONSTRAINT "AdmissionRequestItem_admissionRequestId_fkey" FOREIGN KEY ("admissionRequestId") REFERENCES "AdmissionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequestItem" ADD CONSTRAINT "AdmissionRequestItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_admissionRequestId_fkey" FOREIGN KEY ("admissionRequestId") REFERENCES "AdmissionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
