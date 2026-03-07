/**
 * Cliente Prisma singleton - UNA SOLA instancia por proceso.
 * Todo el código debe importar: import { prisma } from "@/lib/prisma"
 * NO crear new PrismaClient() en rutas, server actions, helpers ni componentes.
 *
 * En Vercel serverless cada función puede ser un proceso distinto; cada uno
 * tendrá su propio singleton. La URL de BD ya incluye connection_limit=1
 * para Seenode, así cada proceso usa solo 1 conexión.
 */
import { PrismaClient } from "@prisma/client";
import { buildDatabaseUrlInfo } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaManagedDbWarningShown?: boolean;
};

const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: [
    { level: "error", emit: "event" },
    { level: "warn", emit: "stdout" },
  ],
};

const dbUrlInfo = buildDatabaseUrlInfo();
if (dbUrlInfo.effectiveUrl) {
  prismaOptions.datasources = { db: { url: dbUrlInfo.effectiveUrl } };
}

const suppressManagedDbWarning = process.env.DATABASE_USE_PRODUCTION === "1";

if (
  process.env.NODE_ENV !== "production" &&
  dbUrlInfo.isManagedPostgres &&
  !suppressManagedDbWarning &&
  !globalForPrisma.prismaManagedDbWarningShown
) {
  console.warn(
    "[Prisma] Desarrollo conectado a BD gestionada (Seenode/Neon). Para evitar saturación, usa Docker local en .env.",
  );
  globalForPrisma.prismaManagedDbWarningShown = true;
}

const prismaClient = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

// Filtrar P2002 (unique constraint) para no llenar la consola; es un caso esperado (ej. DNI duplicado)
prismaClient.$on("error" as never, (e: { message?: string }) => {
  const msg = String(e?.message ?? e).toLowerCase();
  if (msg.includes("p2002") || msg.includes("unique constraint failed")) return;
  if (msg.includes("too many database connections opened") || msg.includes("too many connections for role")) return;
  console.error("[Prisma]", msg);
});

export const prisma = prismaClient;

// Persistir en global para reutilizar entre recargas (dev) o instancias largas (prod).
globalForPrisma.prisma = prisma;
