-- DropForeignKey
ALTER TABLE "StaffDiscount" DROP CONSTRAINT "StaffDiscount_payrollId_fkey";

-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT;

-- AlterTable
ALTER TABLE "Payroll" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PayrollPeriod" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffDiscount" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'MENSUAL',
ADD COLUMN     "ratePerShift" DOUBLE PRECISION,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "StaffShiftCount" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "shiftsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShiftCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffShiftCount_staffMemberId_idx" ON "StaffShiftCount"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffShiftCount_payrollPeriodId_idx" ON "StaffShiftCount"("payrollPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffShiftCount_staffMemberId_payrollPeriodId_key" ON "StaffShiftCount"("staffMemberId", "payrollPeriodId");

-- CreateIndex
CREATE INDEX "LabResult_validatedById_idx" ON "LabResult"("validatedById");

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShiftCount" ADD CONSTRAINT "StaffShiftCount_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShiftCount" ADD CONSTRAINT "StaffShiftCount_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
