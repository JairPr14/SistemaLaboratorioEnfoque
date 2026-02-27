import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

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
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
