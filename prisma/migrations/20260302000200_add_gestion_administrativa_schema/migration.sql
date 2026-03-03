-- AlterTable StaffMember: nuevos campos
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3);
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('BORRADOR', 'CERRADO', 'PAGADO');
CREATE TYPE "PayrollStatus" AS ENUM ('BORRADOR', 'CALCULADO', 'PAGADO');
CREATE TYPE "PayrollLineType" AS ENUM ('BONUS', 'DISCOUNT');
CREATE TYPE "StaffMovementStatus" AS ENUM ('PENDIENTE', 'APLICADO', 'ANULADO');

-- CreateTable DiscountType
CREATE TABLE "DiscountType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscountType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscountType_code_key" ON "DiscountType"("code");
CREATE INDEX "DiscountType_code_idx" ON "DiscountType"("code");
CREATE INDEX "DiscountType_isActive_idx" ON "DiscountType"("isActive");

-- CreateTable BonusType
CREATE TABLE "BonusType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BonusType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BonusType_code_key" ON "BonusType"("code");
CREATE INDEX "BonusType_code_idx" ON "BonusType"("code");
CREATE INDEX "BonusType_isActive_idx" ON "BonusType"("isActive");

-- CreateTable PayrollPeriod
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'BORRADOR',
    "closedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollPeriod_year_month_key" ON "PayrollPeriod"("year", "month");
CREATE INDEX "PayrollPeriod_year_month_idx" ON "PayrollPeriod"("year", "month");
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateTable Payroll
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "bonusesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'BORRADOR',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payroll_staffMemberId_payrollPeriodId_key" ON "Payroll"("staffMemberId", "payrollPeriodId");
CREATE INDEX "Payroll_staffMemberId_idx" ON "Payroll"("staffMemberId");
CREATE INDEX "Payroll_payrollPeriodId_idx" ON "Payroll"("payrollPeriodId");
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateTable PayrollLine
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "lineType" "PayrollLineType" NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "discountTypeId" TEXT,
    "bonusTypeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollLine_payrollId_idx" ON "PayrollLine"("payrollId");

-- CreateTable StaffDiscount
CREATE TABLE "StaffDiscount" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "discountTypeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "payrollId" TEXT,
    "status" "StaffMovementStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffDiscount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffDiscount_staffMemberId_idx" ON "StaffDiscount"("staffMemberId");
CREATE INDEX "StaffDiscount_discountTypeId_idx" ON "StaffDiscount"("discountTypeId");
CREATE INDEX "StaffDiscount_periodYear_periodMonth_idx" ON "StaffDiscount"("periodYear", "periodMonth");
CREATE INDEX "StaffDiscount_status_idx" ON "StaffDiscount"("status");

-- CreateTable StaffBonus
CREATE TABLE "StaffBonus" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "bonusTypeId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "payrollId" TEXT,
    "status" "StaffMovementStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffBonus_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffBonus_staffMemberId_idx" ON "StaffBonus"("staffMemberId");
CREATE INDEX "StaffBonus_periodYear_periodMonth_idx" ON "StaffBonus"("periodYear", "periodMonth");
CREATE INDEX "StaffBonus_status_idx" ON "StaffBonus"("status");

CREATE INDEX "StaffMember_branchId_idx" ON "StaffMember"("branchId");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_discountTypeId_fkey" FOREIGN KEY ("discountTypeId") REFERENCES "DiscountType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_bonusTypeId_fkey" FOREIGN KEY ("bonusTypeId") REFERENCES "BonusType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffDiscount" ADD CONSTRAINT "StaffDiscount_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffDiscount" ADD CONSTRAINT "StaffDiscount_discountTypeId_fkey" FOREIGN KEY ("discountTypeId") REFERENCES "DiscountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffBonus" ADD CONSTRAINT "StaffBonus_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffBonus" ADD CONSTRAINT "StaffBonus_bonusTypeId_fkey" FOREIGN KEY ("bonusTypeId") REFERENCES "BonusType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
