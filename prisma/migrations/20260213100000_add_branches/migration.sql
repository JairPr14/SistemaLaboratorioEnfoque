-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "branchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Branch_code_idx" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Branch_order_idx" ON "Branch"("order");

-- CreateIndex
CREATE INDEX "LabOrder_branchId_idx" ON "LabOrder"("branchId");

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed inicial de sedes basadas en el enum existente
INSERT INTO "Branch" ("id", "code", "name", "order", "isActive", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'CLINICA', 'Clínica', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'EXTERNO', 'Externo', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'IZAGA', 'Izaga', 3, true, NOW(), NOW());
