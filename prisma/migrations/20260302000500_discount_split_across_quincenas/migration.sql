-- DiscountType: add splitAcrossQuincenas for AFP, Seguro (split across both quincenas)
ALTER TABLE "DiscountType" ADD COLUMN IF NOT EXISTS "splitAcrossQuincenas" BOOLEAN NOT NULL DEFAULT false;

-- Mark AFP and SALUD as split types (they deduct in both quincenas)
UPDATE "DiscountType" SET "splitAcrossQuincenas" = true WHERE "code" IN ('AFP', 'SALUD');
