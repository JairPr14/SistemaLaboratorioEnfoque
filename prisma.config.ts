import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DATABASE_URL es opcional durante prisma generate
    // Se usa un fallback para desarrollo local, pero en producción Vercel lo proveerá
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
