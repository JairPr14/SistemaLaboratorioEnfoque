-- Añadir columnas validatedById y validatedAt si no existen
-- (Solución para cuando la migración original falló o no se aplicó)

ALTER TABLE "LabResult" ADD COLUMN IF NOT EXISTS "validatedById" TEXT;
ALTER TABLE "LabResult" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "LabResult_validatedById_idx" ON "LabResult"("validatedById");

-- Añadir FK solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LabResult_validatedById_fkey'
  ) THEN
    ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_validatedById_fkey"
      FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
