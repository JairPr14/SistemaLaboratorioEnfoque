-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "reportedAt" DATETIME,
    "reportedBy" TEXT,
    "comment" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabResult_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "LabOrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LabResult" ("comment", "createdAt", "id", "orderItemId", "reportedAt", "reportedBy", "updatedAt") SELECT "comment", "createdAt", "id", "orderItemId", "reportedAt", "reportedBy", "updatedAt" FROM "LabResult";
DROP TABLE "LabResult";
ALTER TABLE "new_LabResult" RENAME TO "LabResult";
CREATE UNIQUE INDEX "LabResult_orderItemId_key" ON "LabResult"("orderItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
