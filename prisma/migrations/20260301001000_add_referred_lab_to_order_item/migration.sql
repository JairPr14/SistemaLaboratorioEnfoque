-- Add referred lab fields to LabOrderItem
ALTER TABLE "LabOrderItem"
  ADD COLUMN "referredLabId" TEXT,
  ADD COLUMN "externalLabCostSnapshot" DOUBLE PRECISION;

ALTER TABLE "LabOrderItem"
  ADD CONSTRAINT "LabOrderItem_referredLabId_fkey"
  FOREIGN KEY ("referredLabId") REFERENCES "ReferredLab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LabOrderItem_referredLabId_idx"
  ON "LabOrderItem"("referredLabId");

-- Seed existing referenced lab config into order items (if any)
UPDATE "LabOrderItem" oi
SET "referredLabId" = t."referredLabId",
    "externalLabCostSnapshot" = t."externalLabCost"
FROM "LabTest" t
WHERE oi."labTestId" = t."id"
  AND t."referredLabId" IS NOT NULL;

