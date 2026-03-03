-- DropForeignKey
ALTER TABLE "PayrollLine" DROP CONSTRAINT IF EXISTS "PayrollLine_payrollId_fkey";
ALTER TABLE "PayrollLine" DROP CONSTRAINT IF EXISTS "PayrollLine_discountTypeId_fkey";
ALTER TABLE "PayrollLine" DROP CONSTRAINT IF EXISTS "PayrollLine_bonusTypeId_fkey";
ALTER TABLE "StaffDiscount" DROP CONSTRAINT IF EXISTS "StaffDiscount_staffMemberId_fkey";
ALTER TABLE "StaffDiscount" DROP CONSTRAINT IF EXISTS "StaffDiscount_discountTypeId_fkey";
ALTER TABLE "StaffBonus" DROP CONSTRAINT IF EXISTS "StaffBonus_staffMemberId_fkey";
ALTER TABLE "StaffBonus" DROP CONSTRAINT IF EXISTS "StaffBonus_bonusTypeId_fkey";
ALTER TABLE "Payroll" DROP CONSTRAINT IF EXISTS "Payroll_staffMemberId_fkey";
ALTER TABLE "Payroll" DROP CONSTRAINT IF EXISTS "Payroll_payrollPeriodId_fkey";
ALTER TABLE "PeriodStaffDays" DROP CONSTRAINT IF EXISTS "PeriodStaffDays_payrollPeriodId_fkey";
ALTER TABLE "PeriodStaffDays" DROP CONSTRAINT IF EXISTS "PeriodStaffDays_staffMemberId_fkey";
ALTER TABLE "StaffMember" DROP CONSTRAINT IF EXISTS "StaffMember_branchId_fkey";

-- DropTable (StaffMember debe eliminarse antes de los enums porque usa StaffSalaryType)
DROP TABLE IF EXISTS "PayrollLine";
DROP TABLE IF EXISTS "StaffDiscount";
DROP TABLE IF EXISTS "StaffBonus";
DROP TABLE IF EXISTS "Payroll";
DROP TABLE IF EXISTS "PeriodStaffDays";
DROP TABLE IF EXISTS "PayrollPeriod";
DROP TABLE IF EXISTS "DiscountType";
DROP TABLE IF EXISTS "BonusType";
DROP TABLE IF EXISTS "StaffMember";

-- DropEnum
DROP TYPE IF EXISTS "PayrollLineType";
DROP TYPE IF EXISTS "StaffMovementStatus";
DROP TYPE IF EXISTS "PayrollStatus";
DROP TYPE IF EXISTS "PayrollPeriodStatus";
DROP TYPE IF EXISTS "StaffSalaryType";

CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER,
    "jobTitle" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "salary" DOUBLE PRECISION,
    "hireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffMember_lastName_idx" ON "StaffMember"("lastName");
CREATE INDEX "StaffMember_isActive_idx" ON "StaffMember"("isActive");
