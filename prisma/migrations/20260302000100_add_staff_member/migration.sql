-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentNumber" TEXT,
    "jobTitle" TEXT,
    "baseSalary" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_documentNumber_key" ON "StaffMember"("documentNumber");

-- CreateIndex
CREATE INDEX "StaffMember_fullName_idx" ON "StaffMember"("fullName");

-- CreateIndex
CREATE INDEX "StaffMember_isActive_idx" ON "StaffMember"("isActive");
