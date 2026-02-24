-- Create join table for multiple referred labs per test
CREATE TABLE "LabTestReferredLab" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "labTestId" TEXT NOT NULL,
  "referredLabId" TEXT NOT NULL,
  "priceToAdmission" DOUBLE PRECISION,
  "externalLabCost" DOUBLE PRECISION,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE "LabTestReferredLab"
  ADD CONSTRAINT "LabTestReferredLab_labTestId_fkey"
  FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabTestReferredLab"
  ADD CONSTRAINT "LabTestReferredLab_referredLabId_fkey"
  FOREIGN KEY ("referredLabId") REFERENCES "ReferredLab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LabTestReferredLab_labTestId_referredLabId_key"
  ON "LabTestReferredLab"("labTestId", "referredLabId");

CREATE INDEX "LabTestReferredLab_referredLabId_idx"
  ON "LabTestReferredLab"("referredLabId");

-- Seed existing single referredLab config into the new table
INSERT INTO "LabTestReferredLab" ("labTestId", "referredLabId", "priceToAdmission", "externalLabCost", "isDefault")
SELECT "id", "referredLabId", "priceToAdmission", "externalLabCost", TRUE
FROM "LabTest"
WHERE "referredLabId" IS NOT NULL;

