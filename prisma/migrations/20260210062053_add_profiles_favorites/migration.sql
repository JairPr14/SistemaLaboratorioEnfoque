-- CreateTable
CREATE TABLE "UserFavoriteTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFavoriteTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavoriteTest_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TestProfileItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestProfileItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TestProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestProfileItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserFavoriteTest_userId_idx" ON "UserFavoriteTest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteTest_userId_labTestId_key" ON "UserFavoriteTest"("userId", "labTestId");

-- CreateIndex
CREATE INDEX "TestProfileItem_profileId_idx" ON "TestProfileItem"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "TestProfileItem_profileId_labTestId_key" ON "TestProfileItem"("profileId", "labTestId");
