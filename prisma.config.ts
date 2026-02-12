import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DATABASE_URL es opcional durante prisma generate (solo se necesita para migraciones)
    url: env("DATABASE_URL", { optional: true }) || "file:./dev.db",
  },
});
