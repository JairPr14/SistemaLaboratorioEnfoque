-- CreateTable
CREATE TABLE "LabTemplateItemRefRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateItemId" TEXT NOT NULL,
    "ageGroup" TEXT,
    "sex" TEXT,
    "refRangeText" TEXT,
    "refMin" REAL,
    "refMax" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabTemplateItemRefRange_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "LabTemplateItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LabTemplateItemRefRange_templateItemId_idx" ON "LabTemplateItemRefRange"("templateItemId");
