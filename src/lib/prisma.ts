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
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const separator = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  // Seenode y otros cloud Postgres requieren SSL
  if (!url.includes("sslmode=") && (url.includes("seenode") || url.includes("neon.tech") || url.includes("run-on-seenode"))) {
    params.push("sslmode=require");
  }
  if (!url.includes("connection_limit=")) {
    params.push(`connection_limit=${process.env.VERCEL ? 1 : 10}`);
  }
  if (params.length > 0) {
    url = `${url}${separator}${params.join("&")}`;
  }
  return url;
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
