-- CreateTable DiscountType
CREATE TABLE "DiscountType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "splitAcrossQuincenas" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiscountType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscountType_code_key" ON "DiscountType"("code");
CREATE INDEX "DiscountType_code_idx" ON "DiscountType"("code");

-- CreateTable StaffDiscount
CREATE TABLE "StaffDiscount" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "discountTypeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodQuincena" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "payrollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDiscount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffDiscount_staffMemberId_idx" ON "StaffDiscount"("staffMemberId");
CREATE INDEX "StaffDiscount_periodYear_periodMonth_periodQuincena_idx" ON "StaffDiscount"("periodYear", "periodMonth", "periodQuincena");

-- CreateTable PayrollPeriod
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "quincena" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollPeriod_year_month_quincena_key" ON "PayrollPeriod"("year", "month", "quincena");
CREATE INDEX "PayrollPeriod_year_month_quincena_idx" ON "PayrollPeriod"("year", "month", "quincena");

-- CreateTable Payroll
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "discountsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "paymentMethod" TEXT,
    "transferNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payroll_staffMemberId_payrollPeriodId_key" ON "Payroll"("staffMemberId", "payrollPeriodId");
CREATE INDEX "Payroll_staffMemberId_idx" ON "Payroll"("staffMemberId");
CREATE INDEX "Payroll_payrollPeriodId_idx" ON "Payroll"("payrollPeriodId");

-- AddForeignKey
ALTER TABLE "StaffDiscount" ADD CONSTRAINT "StaffDiscount_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffDiscount" ADD CONSTRAINT "StaffDiscount_discountTypeId_fkey" FOREIGN KEY ("discountTypeId") REFERENCES "DiscountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- YAPE y PLIN ya existen en PaymentMethod (añadidos previamente)

-- FK StaffDiscount -> Payroll (opcional)
ALTER TABLE "StaffDiscount" ADD CONSTRAINT "StaffDiscount_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;
