-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F', 'O');

-- AlterTable Patient: convertir sex de TEXT a Sex
ALTER TABLE "Patient" ALTER COLUMN "sex" TYPE "Sex" USING sex::"Sex";

-- AlterTable LabTemplateItemRefRange: convertir sex de TEXT a Sex (nullable)
ALTER TABLE "LabTemplateItemRefRange" ALTER COLUMN "sex" DROP DEFAULT, ALTER COLUMN "sex" TYPE "Sex" USING (CASE WHEN sex IS NULL THEN NULL::"Sex" ELSE sex::"Sex" END);
