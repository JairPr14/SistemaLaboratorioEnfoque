-- Corrige pacientes con DNI nulo: asigna valor único para cumplir constraint
UPDATE "Patient"
SET "dni" = 'SIN-DNI-' || "id"
WHERE "dni" IS NULL;
