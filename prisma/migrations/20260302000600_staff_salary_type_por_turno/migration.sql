-- StaffSalaryType enum
CREATE TYPE "StaffSalaryType" AS ENUM ('FIJO', 'POR_TURNO');

-- StaffMember: add salaryType, dailyRate
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "salaryType" "StaffSalaryType" NOT NULL DEFAULT 'FIJO';
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "dailyRate" DOUBLE PRECISION;

-- Payroll: add daysWorked
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "daysWorked" INTEGER;

-- PeriodStaffDays: días trabajados por turno (antes de pagar)
CREATE TABLE IF NOT EXISTS "PeriodStaffDays" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "daysWorked" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodStaffDays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PeriodStaffDays_payrollPeriodId_staffMemberId_key" ON "PeriodStaffDays"("payrollPeriodId", "staffMemberId");
CREATE INDEX IF NOT EXISTS "PeriodStaffDays_payrollPeriodId_idx" ON "PeriodStaffDays"("payrollPeriodId");

ALTER TABLE "PeriodStaffDays" ADD CONSTRAINT "PeriodStaffDays_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeriodStaffDays" ADD CONSTRAINT "PeriodStaffDays_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
