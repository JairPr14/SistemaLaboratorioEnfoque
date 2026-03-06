/**
 * Restaura el archivo backup-production.sql en la base de datos de producción.
 * Úsalo SOLO si tienes un backup (p. ej. el que generaste con db:copy-production)
 * y quieres devolver esos datos a producción.
 *
 * ⚠️ ADVERTENCIA: Esto SOBRESCRIBE los datos actuales en producción.
 *
 * Uso:
 *   1. Asegúrate de tener backup-production.sql en la raíz del proyecto.
 *   2. Define la URL de producción:
 *      PowerShell: $env:PRODUCTION_DATABASE_URL="postgresql://..."
 *      Bash: export PRODUCTION_DATABASE_URL="postgresql://..."
 *   3. Ejecuta: pnpm db:restore-to-production
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const BACKUP_FILE = path.join(process.cwd(), "backup-production.sql");
const PROD_URL_FILE = path.join(process.cwd(), ".prod-url.txt");

function run(cmd: string) {
  execSync(cmd, {
    stdio: "inherit",
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}

function ask(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (escribe sí y Enter para continuar): `, (answer) => {
      rl.close();
      resolve(answer?.trim().toLowerCase() === "sí" || answer?.trim().toLowerCase() === "si");
    });
  });
}

async function main() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error("❌ No existe backup-production.sql en la raíz del proyecto.");
    console.log("\nSi antes ejecutaste pnpm db:copy-production, ese comando generaba ese archivo.");
    console.log("Si lo borraste, no hay forma de recuperar desde este script.");
    console.log("Revisa si Seenode/Neon ofrece backups automáticos o point-in-time recovery.");
    process.exit(1);
  }

  const prodUrl = process.env.PRODUCTION_DATABASE_URL?.trim();
  if (!prodUrl) {
    console.error("❌ Falta PRODUCTION_DATABASE_URL.");
    console.log("\nPowerShell: $env:PRODUCTION_DATABASE_URL=\"postgresql://...\"");
    console.log("Bash: export PRODUCTION_DATABASE_URL=\"postgresql://...\"");
    process.exit(1);
  }

  console.log("⚠️  Vas a restaurar backup-production.sql en la BD de PRODUCCIÓN.");
  console.log("   Los datos actuales en producción serán reemplazados por el contenido del backup.\n");
  const ok = await ask("¿Estás seguro?");
  if (!ok) {
    console.log("Cancelado.");
    process.exit(0);
  }

  const cwd = process.cwd();
  const prodUrlForPsql = prodUrl.includes("sslmode=") ? prodUrl : `${prodUrl}${prodUrl.includes("?") ? "&" : "?"}sslmode=require`;

  try {
    fs.writeFileSync(PROD_URL_FILE, prodUrlForPsql, "utf8");
  } catch {
    console.error("❌ No se pudo escribir .prod-url.txt");
    process.exit(1);
  }

  console.log("\n📥 Restaurando backup en producción...");
  try {
    run(`docker run --rm -v "${cwd}:/out" postgres:16-alpine sh -c 'URL=$(cat /out/.prod-url.txt); psql "$URL" -f /out/backup-production.sql'`);
  } catch (e) {
    console.error("❌ Error al restaurar. Revisa PRODUCTION_DATABASE_URL y que Docker esté corriendo.");
    process.exit(1);
  } finally {
    try { fs.unlinkSync(PROD_URL_FILE); } catch { /* ignore */ }
  }

  console.log("\n✅ Restauración completada.");
}

main();
