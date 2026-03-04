import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrlWithConnectionLimit(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
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
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
