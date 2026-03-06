/**
 * Copia la base de datos de producción a PostgreSQL local (Docker).
 * Este script SOLO LEE de producción (pg_dump) y ESCRIBE en local (psql). No modifica Seenode.
 *
 * Importante: Durante todo el proceso, .env debe tener DATABASE_URL apuntando a localhost (Docker),
 * no a Seenode, para no ejecutar por error migraciones o seeds contra producción.
 *
 * Uso:
 *   1. .env con DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sistema_lab_dev
 *   2. Docker y Postgres local arriba: docker compose up -d
 *   3. PRODUCTION_DATABASE_URL solo en la sesión (PowerShell/Bash), no en .env
 *   4. pnpm db:copy-production
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const LOCAL_URL = "postgresql://postgres:postgres@host.docker.internal:5432/sistema_lab_dev";
const BACKUP_FILE = path.join(process.cwd(), "backup-production.sql");
const PROD_URL_FILE = path.join(process.cwd(), ".prod-url.txt");

function run(cmd: string) {
  execSync(cmd, {
    stdio: "inherit",
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}

function main() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL?.trim();
  if (!prodUrl) {
    console.error("❌ Falta PRODUCTION_DATABASE_URL.");
    console.log("\nEjemplo (PowerShell):");
    console.log('  $env:PRODUCTION_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
    console.log("\nEjemplo (Bash):");
    console.log('  export PRODUCTION_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
    console.log("\nLuego ejecuta de nuevo: pnpm db:copy-production");
    process.exit(1);
  }

  const cwd = process.cwd();
  const prodUrlForDump = prodUrl.includes("sslmode=") ? prodUrl : `${prodUrl}${prodUrl.includes("?") ? "&" : "?"}sslmode=require`;

  try {
    fs.writeFileSync(PROD_URL_FILE, prodUrlForDump, "utf8");
  } catch (e) {
    console.error("❌ No se pudo escribir el archivo temporal .prod-url.txt");
    process.exit(1);
  }

  console.log("📤 1/2 Volcando base de datos de producción...");
  try {
    run(`docker run --rm -v "${cwd}:/out" postgres:16-alpine sh -c 'URL=$(cat /out/.prod-url.txt); pg_dump "$URL" --no-owner --no-acl --clean --if-exists -f /out/backup-production.sql'`);
  } catch {
    console.error("❌ Error al hacer el volcado. Comprueba PRODUCTION_DATABASE_URL y que Docker esté corriendo.");
    try { fs.unlinkSync(PROD_URL_FILE); } catch { /* ignore */ }
    process.exit(1);
  } finally {
    try { fs.unlinkSync(PROD_URL_FILE); } catch { /* ignore */ }
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error("❌ No se generó backup-production.sql");
    process.exit(1);
  }

  const restoreCmd = `docker run --rm -e LOCAL_DATABASE_URL="${LOCAL_URL}" -v "${cwd}:/out" --add-host=host.docker.internal:host-gateway postgres:16-alpine sh -c "psql \\$LOCAL_DATABASE_URL -f /out/backup-production.sql || true"`;
  console.log("📥 2/2 Restaurando en PostgreSQL local (Docker)...");
  try {
    run(restoreCmd);
  } catch {
    console.error("❌ Error al restaurar. ¿Está el contenedor Postgres local arriba? (docker compose up -d)");
    process.exit(1);
  }

  console.log("\n✅ Copia completada. BD local ≈ producción.");
  console.log("   (Este comando no escribe en Seenode; solo leyó de allí y escribió en Docker.)");
  console.log("   Puedes borrar el archivo temporal: backup-production.sql");
}

main();
