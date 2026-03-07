/**
 * Copia la base de datos de Docker local a Seenode (producción).
 * Los datos actuales en Seenode serán REEMPLAZADOS por los de Docker.
 *
 * ⚠️ ADVERTENCIA: Esto sobrescribe los datos en producción.
 *
 * Uso:
 *   1. Docker arriba con datos: pnpm docker:up
 *   2. DATABASE_URL en .env apuntando a Docker (localhost:5433)
 *   3. PRODUCTION_DATABASE_URL en .env con la URL de Seenode
 *   4. pnpm db:push-to-production
 */
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BACKUP_FILE = path.join(process.cwd(), "backup-docker.sql");
const LOCAL_PORT = process.env.DOCKER_POSTGRES_PORT || "5433";
const LOCAL_URL = `postgresql://postgres:postgres@host.docker.internal:${LOCAL_PORT}/sistema_lab_dev`;

function runDocker(args: string[], env?: Record<string, string>): boolean {
  const r = spawnSync("docker", args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, ...env },
  });
  return r.status === 0;
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

/** Parsea URL de PostgreSQL */
function parsePostgresUrl(url: string): { host: string; port: string; user: string; password: string; database: string } {
  const trimmed = url.trim();
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
      throw new Error("Formato de URL inválido. Usa: postgresql://user:pass@host:PUERTO/db?sslmode=require");
    }
  }
  const [, user, password, host, port, database] = match;
  return { host, port, user: decodeURIComponent(user), password: decodeURIComponent(password), database: database || "postgres" };
}

function main() {
  let prodUrl = process.env.PRODUCTION_DATABASE_URL?.trim();
  if (!prodUrl) {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const m = trimmed.match(/^PRODUCTION_DATABASE_URL\s*=\s*["']?([^"'\s#]+)/);
        if (m?.[1]) {
          prodUrl = m[1].trim();
          break;
        }
      }
    }
  }

  if (!prodUrl) {
    console.error("❌ Falta PRODUCTION_DATABASE_URL en .env");
    process.exit(1);
  }

  const urlWithSsl = prodUrl.includes("sslmode=") ? prodUrl : `${prodUrl}${prodUrl.includes("?") ? "&" : "?"}sslmode=require`;
  let prodParams: ReturnType<typeof parsePostgresUrl>;
  try {
    prodParams = parsePostgresUrl(urlWithSsl);
  } catch (e) {
    console.error("❌ PRODUCTION_DATABASE_URL inválida:", String(e));
    process.exit(1);
  }

  if (!isDockerPostgresRunning()) {
    console.error("❌ Docker Postgres no está corriendo. Ejecuta: pnpm docker:up");
    process.exit(1);
  }

  const cwd = process.cwd();

  console.log("📤 1/2 Volcando Docker local...");
  const dumpOk = runDocker([
    "run", "--rm", "-v", `${cwd}:/out`,
    "-e", `PGHOST=host.docker.internal`,
    "-e", `PGPORT=${LOCAL_PORT}`,
    "-e", `PGUSER=postgres`,
    "-e", `PGPASSWORD=postgres`,
    "-e", `PGDATABASE=sistema_lab_dev`,
    ...(process.platform !== "win32" ? ["--add-host=host.docker.internal:host-gateway"] : []),
    "postgres:16-alpine",
    "sh", "-c", "pg_dump --no-owner --no-acl --clean --if-exists -f /out/backup-docker.sql",
  ]);

  if (!dumpOk || !fs.existsSync(BACKUP_FILE)) {
    console.error("❌ Error al volcar Docker");
    process.exit(1);
  }

  console.log("📥 2/2 Restaurando en Seenode...");
  const prodEnv: Record<string, string> = {
    PGHOST: prodParams.host,
    PGPORT: prodParams.port,
    PGUSER: prodParams.user,
    PGPASSWORD: prodParams.password,
    PGDATABASE: prodParams.database,
    PGSSLMODE: "require",
  };

  const restoreOk = runDocker(
    ["run", "--rm", "-v", `${cwd}:/out`, ...Object.entries(prodEnv).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
      "postgres:16-alpine", "sh", "-c", "psql -f /out/backup-docker.sql"]
  );

  try { fs.unlinkSync(BACKUP_FILE); } catch { /* ignore */ }

  if (!restoreOk) {
    console.error("❌ Error al restaurar en Seenode");
    process.exit(1);
  }

  console.log("\n✅ Datos de Docker copiados a Seenode. Ambas BDs tienen los mismos datos.");
}

main();
