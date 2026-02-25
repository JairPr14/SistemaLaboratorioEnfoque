-- CreateTable
CREATE TABLE "LabTemplateItemRefRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateItemId" TEXT NOT NULL,
    "ageGroup" TEXT,
    "sex" TEXT,
    "refRangeText" TEXT,
    "refMin" DOUBLE PRECISION,
    "refMax" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabTemplateItemRefRange_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "LabTemplateItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LabTemplateItemRefRange_templateItemId_idx" ON "LabTemplateItemRefRange"("templateItemId");
