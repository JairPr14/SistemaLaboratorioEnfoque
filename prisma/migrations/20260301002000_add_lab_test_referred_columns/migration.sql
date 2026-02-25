-- Add missing LabTest columns for referred lab (schema expects these)
ALTER TABLE "LabTest" ADD COLUMN IF NOT EXISTS "isReferred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LabTest" ADD COLUMN IF NOT EXISTS "referredLabId" TEXT;
ALTER TABLE "LabTest" ADD COLUMN IF NOT EXISTS "priceToAdmission" DOUBLE PRECISION;
ALTER TABLE "LabTest" ADD COLUMN IF NOT EXISTS "externalLabCost" DOUBLE PRECISION;

-- Add FK for referredLabId
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabTest_referredLabId_fkey') THEN
    ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_referredLabId_fkey" 
      FOREIGN KEY ("referredLabId") REFERENCES "ReferredLab"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "LabTest_referredLabId_idx" ON "LabTest"("referredLabId");
