-- CreateTable ReferredLab (debe existir antes de ReferredLabPayment)
CREATE TABLE IF NOT EXISTS "ReferredLab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "stampImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferredLab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReferredLab_isActive_idx" ON "ReferredLab"("isActive");

-- CreateTable
CREATE TABLE "ReferredLabPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "referredLabId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferredLabPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferredLabPayment_orderId_idx" ON "ReferredLabPayment"("orderId");

-- CreateIndex
CREATE INDEX "ReferredLabPayment_referredLabId_idx" ON "ReferredLabPayment"("referredLabId");

-- CreateIndex
CREATE INDEX "ReferredLabPayment_paidAt_idx" ON "ReferredLabPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "ReferredLabPayment" ADD CONSTRAINT "ReferredLabPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferredLabPayment" ADD CONSTRAINT "ReferredLabPayment_referredLabId_fkey" FOREIGN KEY ("referredLabId") REFERENCES "ReferredLab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferredLabPayment" ADD CONSTRAINT "ReferredLabPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
