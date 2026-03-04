import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/** Comprueba que DATABASE_URL esté definida (útil para detectar errores de configuración). */
export function ensureDatabaseUrl(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL no está configurada. Compruebe el archivo .env y que la base de datos esté en ejecución (ej. docker compose up -d)."
    );
  }
}

function getDatabaseUrlWithConnectionLimit(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("connection_limit=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=10`;
}

const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: ["error", "warn"],
};

const dbUrlWithLimit = getDatabaseUrlWithConnectionLimit();
if (dbUrlWithLimit) {
  prismaOptions.datasources = { db: { url: dbUrlWithLimit } };
} else {
  ensureDatabaseUrl(); // fallback si no se pasó URL en datasources
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
