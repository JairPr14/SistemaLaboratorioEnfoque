import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrlWithConnectionLimit(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return undefined;
  const separator = url.includes("?") ? "&" : "?";
  const params: string[] = [];

  const isManagedPostgres =
    url.includes("seenode") || url.includes("neon.tech") || url.includes("run-on-seenode");

  // Seenode, Neon y otros cloud Postgres suelen requerir SSL
  if (!url.includes("sslmode=") && isManagedPostgres) {
    params.push("sslmode=require");
  }

  if (!url.includes("connection_limit=")) {
    // En serverless (Vercel), cada instancia crea su propio pool. Usar límite alto
    // por instancia puede saturar rápido una BD gestionada.
    // Managed Postgres:
    // - Vercel: 1 conexión por instancia (más seguro contra "too many connections")
    // - Local dev: 5 conexiones para trabajar con más fluidez
    // Local (Docker): 10 conexiones.
    const limit = isManagedPostgres ? (process.env.VERCEL ? 1 : 5) : process.env.VERCEL ? 5 : 10;
    params.push(`connection_limit=${limit}`);
  }

  return params.length > 0 ? `${url}${separator}${params.join("&")}` : url;
}

const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: [
    { level: "error", emit: "event" },
    { level: "warn", emit: "stdout" },
  ],
};

const dbUrlWithLimit = getDatabaseUrlWithConnectionLimit();
if (dbUrlWithLimit) {
  prismaOptions.datasources = { db: { url: dbUrlWithLimit } };
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
