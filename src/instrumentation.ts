/**
 * Se ejecuta una vez al iniciar el servidor Next.js.
 * Asegura que las columnas validatedById/validatedAt existan en LabResult
 * (workaround cuando la migración original no se aplicó en la BD en uso).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LabResult" ADD COLUMN IF NOT EXISTS "validatedById" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LabResult" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3)`
    );
    await prisma.$disconnect();
  } catch {
    // Ignorar: columnas ya existen o BD no disponible
  }
}
