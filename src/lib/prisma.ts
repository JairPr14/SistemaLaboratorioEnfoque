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

if (
  process.env.NODE_ENV !== "production" &&
  dbUrlInfo.isManagedPostgres &&
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
  const msg = String(e?.message ?? e);
  if (msg.includes("P2002") || msg.includes("Unique constraint failed")) return;
  console.error("[Prisma]", msg);
});

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
