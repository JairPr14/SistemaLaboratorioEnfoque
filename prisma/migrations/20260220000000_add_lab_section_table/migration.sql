-- Create table with temp name to avoid conflict with enum type
CREATE TABLE "LabSectionNew" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSectionNew_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabSectionNew_code_key" ON "LabSectionNew"("code");

-- Insert default sections
INSERT INTO "LabSectionNew" ("id", "code", "name", "order", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'BIOQUIMICA', 'Bioquímica', 0, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'HEMATOLOGIA', 'Hematología', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INMUNOLOGIA', 'Inmunología', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ORINA', 'Orina', 3, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'HECES', 'Heces', 4, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'OTROS', 'Otros', 5, true, NOW(), NOW());

-- Add sectionId column (nullable first)
ALTER TABLE "LabTest" ADD COLUMN "sectionId" TEXT;

-- Backfill sectionId from section (section can be enum or text)
UPDATE "LabTest" t
SET "sectionId" = s."id"
FROM "LabSectionNew" s
WHERE s."code" = (t."section")::TEXT;

-- For any LabTest with section not in LabSectionNew, assign OTROS
UPDATE "LabTest" t
SET "sectionId" = (SELECT "id" FROM "LabSectionNew" WHERE "code" = 'OTROS' LIMIT 1)
WHERE t."sectionId" IS NULL;

-- Make sectionId NOT NULL
ALTER TABLE "LabTest" ALTER COLUMN "sectionId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LabSectionNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old section column (and enum type if applicable)
ALTER TABLE "LabTest" DROP COLUMN "section";

-- Drop enum type if exists
DROP TYPE IF EXISTS "LabSection" CASCADE;

-- Rename table to LabSection
ALTER TABLE "LabSectionNew" RENAME TO "LabSection";

-- Rename constraints and indexes
ALTER INDEX "LabSectionNew_code_key" RENAME TO "LabSection_code_key";
ALTER TABLE "LabSection" RENAME CONSTRAINT "LabSectionNew_pkey" TO "LabSection_pkey";

-- CreateIndex
CREATE INDEX "LabTest_sectionId_idx" ON "LabTest"("sectionId");
CREATE INDEX "LabSection_code_idx" ON "LabSection"("code");
