-- PayrollPeriod: add quincena, update unique
ALTER TABLE "PayrollPeriod" ADD COLUMN IF NOT EXISTS "quincena" INTEGER NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS "PayrollPeriod_year_month_key";
CREATE UNIQUE INDEX "PayrollPeriod_year_month_quincena_key" ON "PayrollPeriod"("year", "month", "quincena");
CREATE INDEX IF NOT EXISTS "PayrollPeriod_year_month_quincena_idx" ON "PayrollPeriod"("year", "month", "quincena");
DROP INDEX IF EXISTS "PayrollPeriod_year_month_idx";

-- Payroll: add paymentMethod
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";

-- StaffDiscount: add periodQuincena
ALTER TABLE "StaffDiscount" ADD COLUMN IF NOT EXISTS "periodQuincena" INTEGER NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS "StaffDiscount_periodYear_periodMonth_idx";
CREATE INDEX IF NOT EXISTS "StaffDiscount_periodYear_periodMonth_periodQuincena_idx" ON "StaffDiscount"("periodYear", "periodMonth", "periodQuincena");

-- StaffBonus: add periodQuincena
ALTER TABLE "StaffBonus" ADD COLUMN IF NOT EXISTS "periodQuincena" INTEGER NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS "StaffBonus_periodYear_periodMonth_idx";
CREATE INDEX IF NOT EXISTS "StaffBonus_periodYear_periodMonth_periodQuincena_idx" ON "StaffBonus"("periodYear", "periodMonth", "periodQuincena");
