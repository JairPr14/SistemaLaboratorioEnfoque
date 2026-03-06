/**
 * Abre Prisma Studio usando la BD local (Docker).
 * Así no consumes conexiones de Seenode y evitas "too many connections".
 *
 * Uso: pnpm studio:local
 * Requiere: docker compose up -d (Postgres local corriendo)
 */

import { execSync } from "child_process";

const LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/sistema_lab_dev";

process.env.DATABASE_URL = LOCAL_URL;
execSync("npx prisma studio", {
  stdio: "inherit",
  shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
});
