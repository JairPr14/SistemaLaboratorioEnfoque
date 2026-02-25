-- Add referred lab fields to LabOrderItem
ALTER TABLE "LabOrderItem"
  ADD COLUMN "referredLabId" TEXT,
  ADD COLUMN "externalLabCostSnapshot" DOUBLE PRECISION;

ALTER TABLE "LabOrderItem"
  ADD CONSTRAINT "LabOrderItem_referredLabId_fkey"
  FOREIGN KEY ("referredLabId") REFERENCES "ReferredLab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LabOrderItem_referredLabId_idx"
  ON "LabOrderItem"("referredLabId");

-- Seed: solo si LabTest tiene referredLabId (puede no existir en BDs nuevas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LabTest' AND column_name = 'referredLabId'
  ) THEN
    UPDATE "LabOrderItem" oi
    SET "referredLabId" = t."referredLabId",
        "externalLabCostSnapshot" = t."externalLabCost"
    FROM "LabTest" t
    WHERE oi."labTestId" = t."id"
      AND t."referredLabId" IS NOT NULL;
  END IF;
END
$$;

