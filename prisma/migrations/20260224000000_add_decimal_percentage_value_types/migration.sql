-- CreateEnum (si no existe) y añadir valores
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ValueType') THEN
    CREATE TYPE "ValueType" AS ENUM ('NUMBER', 'TEXT', 'SELECT', 'DECIMAL', 'PERCENTAGE');
  ELSE
    ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'DECIMAL';
    ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'PERCENTAGE';
  END IF;
END
$$;
