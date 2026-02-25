import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DATABASE_URL: PostgreSQL (Seenode, Neon, etc.) o file:./dev.db para SQLite local
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
