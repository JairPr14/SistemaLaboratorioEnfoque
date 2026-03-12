/**
 * Copia la base de datos de producción a PostgreSQL local (Docker).
 * Este script SOLO LEE de producción (pg_dump) y ESCRIBE en local (psql). No modifica Seenode.
 *
 * Importante: Durante todo el proceso, .env debe tener DATABASE_URL apuntando a localhost (Docker),
 * no a Seenode, para no ejecutar por error migraciones o seeds contra producción.
 *
 * Uso:
 *   1. .env con DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sistema_lab_dev
 *   2. Docker y Postgres local arriba: pnpm docker:up
 *   3. PRODUCTION_DATABASE_URL solo en la sesión (PowerShell/Bash), no en .env
 *   4. pnpm db:copy-production
 *
 * O todo en uno: pnpm db:setup-from-production (levanta Docker y copia si PRODUCTION_DATABASE_URL está en .env)
 */

import "dotenv/config";
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BACKUP_FILE = path.join(process.cwd(), "backup-production.sql");

/** URL para restaurar: usa DATABASE_URL. Si es localhost, reemplaza por host.docker.internal (Docker accede al host). */
function getLocalRestoreUrl(): string {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error("DATABASE_URL no está definida en .env");
  // Dentro de Docker, localhost es el contenedor; host.docker.internal = máquina host
  return dbUrl.replace(/localhost|127\.0\.0\.1/, "host.docker.internal");
}

function runDocker(args: string[], env?: Record<string, string>): boolean {
  const r = spawnSync("docker", args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, ...env },
  });
  return r.status === 0;
}

function dockerComposeUp(): boolean {
  console.log("🐳 Levantando PostgreSQL en Docker...");
  const r = spawnSync("docker", ["compose", "up", "-d"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (r.status !== 0) return false;
  console.log("⏳ Esperando 5 segundos a que Postgres esté listo...");
  execSync('node -e "const d=Date.now();while(Date.now()-d<5000);"', { stdio: "ignore" });
  return true;
}

function isDockerPostgresRunning(): boolean {
  try {
    const r = spawnSync("docker", ["ps", "-q", "-f", "name=sistema-lab-postgres-dev"], {
      encoding: "utf8",
    });
    return r.status === 0 && (r.stdout?.trim() ?? "").length > 0;
  } catch {
    return false;
  }
}

/** Parsea URL de PostgreSQL y devuelve parámetros. Evita errores con contraseñas con : o @ */
function parsePostgresUrl(url: string): { host: string; port: string; user: string; password: string; database: string } {
  const trimmed = url.trim();
  // Node URL() puede fallar con postgresql://; usar regex como fallback
  const match = trimmed.match(/^postgres(?:ql)?:\/\/([^:@]+):([^@]*)@([^:\/]+):(\d+)\/([^?#]*)/);
  if (!match) {
    try {
      const parsed = new URL(trimmed.replace(/^postgresql:/, "https:"));
      const database = (parsed.pathname || "/").replace(/^\//, "") || "postgres";
      const port = parsed.port || "5432";
      if (!/^\d+$/.test(port)) throw new Error(`Puerto inválido: ${port}`);
      return {
        host: parsed.hostname || "localhost",
        port,
        user: decodeURIComponent(parsed.username || "postgres"),
        password: decodeURIComponent(parsed.password || ""),
        database: database || "postgres",
      };
    } catch {
      throw new Error(
        'Formato esperado: postgresql://usuario:contraseña@host:PUERTO/base?sslmode=require. ' +
          'Reemplaza "..." en .env por la contraseña real de Seenode.'
      );
    }
  }
  const [, user, password, host, port, database] = match;
  if (!/^\d+$/.test(port)) {
    throw new Error(`Puerto inválido "${port}". Verifica que la URL tenga formato postgresql://user:pass@host:PUERTO/db`);
  }
  return {
    host,
    port,
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    database: database || "postgres",
  };
}

function main() {
  let prodUrl = process.env.PRODUCTION_DATABASE_URL?.trim();
  if (!prodUrl) {
    // Intentar leer de .env (solo líneas no comentadas)
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const match = trimmed.match(/^PRODUCTION_DATABASE_URL\s*=\s*["']?([^"'\s#]+)/);
        if (match?.[1]) {
          prodUrl = match[1].trim();
          break;
        }
      }
    }
  }
  if (!prodUrl) {
    console.error("❌ Falta PRODUCTION_DATABASE_URL.");
    console.log("\nAñade en .env (o como variable de sesión):");
    console.log('  PRODUCTION_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
    console.log("\nEjemplo (PowerShell, sesión):");
    console.log('  $env:PRODUCTION_DATABASE_URL="postgresql://..."');
    console.log("\nLuego: pnpm db:copy-production");
    process.exit(1);
  }

  const cwd = process.cwd();
  const urlWithSsl = prodUrl.includes("sslmode=") ? prodUrl : `${prodUrl}${prodUrl.includes("?") ? "&" : "?"}sslmode=require`;

  let connParams: ReturnType<typeof parsePostgresUrl>;
  try {
    connParams = parsePostgresUrl(urlWithSsl);
  } catch (e) {
    console.error("❌ PRODUCTION_DATABASE_URL tiene formato inválido.");
    console.error(String(e));
    process.exit(1);
  }

  // Docker solo se usa para ejecutar pg_dump y psql; el destino puede ser PostgreSQL local o Docker
  let localUrl: string;
  try {
    localUrl = getLocalRestoreUrl();
  } catch (e) {
    console.error("❌", String(e));
    process.exit(1);
  }

  console.log("📤 1/2 Volcando base de datos de producción...");
  // Usar parámetros separados: evita "invalid integer value port" cuando la contraseña tiene :
  const dumpEnv: Record<string, string> = {
    PGHOST: connParams.host,
    PGPORT: connParams.port,
    PGUSER: connParams.user,
    PGPASSWORD: connParams.password,
    PGDATABASE: connParams.database,
    PGSSLMODE: "require",
  };
  const dumpOk = runDocker(
    [
      "run",
      "--rm",
      "-v",
      `${cwd}:/out`,
      ...Object.entries(dumpEnv).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
      "postgres:16-alpine",
      "sh",
      "-c",
      "pg_dump --no-owner --no-acl --clean --if-exists -f /out/backup-production.sql",
    ]
  );
  if (!dumpOk) {
    console.error("❌ Error al hacer el volcado. Comprueba PRODUCTION_DATABASE_URL y que Docker esté corriendo.");
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error("❌ No se generó backup-production.sql");
    process.exit(1);
  }

  const restoreArgs = [
    "run",
    "--rm",
    "-e",
    `LOCAL_DATABASE_URL=${localUrl}`,
    "-v",
    `${cwd}:/out`,
    ...(process.platform !== "win32" ? ["--add-host=host.docker.internal:host-gateway"] : []),
    "postgres:16-alpine",
    "sh",
    "-c",
    "psql $LOCAL_DATABASE_URL -f /out/backup-production.sql",
  ];
  console.log("📥 2/2 Restaurando en PostgreSQL local...");
  if (!runDocker(restoreArgs)) {
    console.error("❌ Error al restaurar. Verifica que PostgreSQL local esté corriendo y DATABASE_URL en .env sea correcta.");
    process.exit(1);
  }

  console.log("\n✅ Copia completada. BD local ≈ producción (Seenode).");
  console.log("   DATABASE_URL en .env apunta a tu PostgreSQL local.");
  console.log("   Reinicia pnpm dev si estaba corriendo.");
}

main();
