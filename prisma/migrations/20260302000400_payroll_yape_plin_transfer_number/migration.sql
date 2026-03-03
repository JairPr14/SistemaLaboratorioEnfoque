-- PaymentMethod: add YAPE, PLIN for payroll
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'YAPE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PLIN';

-- Payroll: add transferNumber for transfer verification
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "transferNumber" TEXT;
