-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'ENTREGADO', 'ANULADO');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO');

-- LabOrder.status: quitar DEFAULT, convertir a enum, restaurar DEFAULT
ALTER TABLE "LabOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LabOrder" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
ALTER TABLE "LabOrder" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE'::"OrderStatus";

-- LabOrderItem.status: quitar DEFAULT, convertir a enum, restaurar DEFAULT
ALTER TABLE "LabOrderItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LabOrderItem" ALTER COLUMN "status" TYPE "OrderItemStatus" USING "status"::"OrderItemStatus";
ALTER TABLE "LabOrderItem" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE'::"OrderItemStatus";
