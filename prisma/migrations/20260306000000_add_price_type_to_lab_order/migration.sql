-- CreateEnum
CREATE TYPE "OrderPriceType" AS ENUM ('PUBLICO', 'CONVENIO');

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "priceType" "OrderPriceType" NOT NULL DEFAULT 'PUBLICO';

-- CreateIndex
CREATE INDEX "LabOrder_priceType_idx" ON "LabOrder"("priceType");
