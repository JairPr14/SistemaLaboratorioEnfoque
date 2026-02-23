ALTER TABLE "LabOrder" ADD COLUMN "preAnalyticNote" TEXT;

CREATE TABLE "PreAnalyticNoteTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreAnalyticNoteTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreAnalyticNoteTemplate_code_key" ON "PreAnalyticNoteTemplate"("code");
CREATE INDEX "PreAnalyticNoteTemplate_code_idx" ON "PreAnalyticNoteTemplate"("code");
CREATE INDEX "PreAnalyticNoteTemplate_isActive_idx" ON "PreAnalyticNoteTemplate"("isActive");
