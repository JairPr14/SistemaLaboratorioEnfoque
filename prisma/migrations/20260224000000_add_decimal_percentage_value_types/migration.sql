-- AlterEnum
-- Add DECIMAL and PERCENTAGE to ValueType enum (PostgreSQL)
-- If the column uses TEXT instead of enum, remove this migration
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'DECIMAL';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'PERCENTAGE';
