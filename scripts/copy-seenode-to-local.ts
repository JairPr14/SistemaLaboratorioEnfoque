/**
 * Copia la BD de Seenode a PostgreSQL local SIN Docker.
 * Usa el paquete pg para conectar a ambas bases de datos.
 */
import "dotenv/config";
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const prodUrl = process.env.PRODUCTION_DATABASE_URL?.trim();
const localUrl = process.env.DATABASE_URL?.trim();

if (!prodUrl || !localUrl) {
  console.error("❌ Faltan PRODUCTION_DATABASE_URL y/o DATABASE_URL en .env");
  process.exit(1);
}

async function main() {
  const prodConnUrl = prodUrl.includes("sslmode=")
    ? prodUrl.replace(/sslmode=[^&]+/, "sslmode=no-verify")
    : `${prodUrl}${prodUrl.includes("?") ? "&" : "?"}sslmode=no-verify`;
  const prodClient = new Client({
    connectionString: prodConnUrl,
    ssl: { rejectUnauthorized: false },
  });
  const localConnUrl = localUrl.replace(/\?.*$/, "").replace(/sslmode=[^&]+&?/g, "");
  const localClient = new Client({ connectionString: localConnUrl, ssl: false });

  try {
    console.log("📤 Conectando a Seenode (producción)...");
    await prodClient.connect();

    console.log("📥 Conectando a PostgreSQL local...");
    await localClient.connect();

    const tablesRes = await prodClient.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma_%'
      AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `);
    const tables = tablesRes.rows.map((r) => r.tablename);

    if (tables.length === 0) {
      console.log("⚠️ No hay tablas en producción.");
      return;
    }

    console.log(`📋 Truncando y copiando ${tables.length} tablas...`);
    await localClient.query("SET session_replication_role = replica");
    for (const table of tables) {
      try {
        await localClient.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch {
        /* tabla puede no existir */
      }
    }
    for (const table of tables) {
      try {
        const res = await prodClient.query(`SELECT * FROM "${table}"`);
        if (res.rows.length === 0) {
          console.log(`   ✓ ${table}: 0 filas`);
          continue;
        }

        const cols = Object.keys(res.rows[0]);
        const colList = cols.map((c) => `"${c}"`).join(", ");
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

        for (const row of res.rows) {
          const values = cols.map((c) => row[c]);
          await localClient.query(insertSql, values);
        }
        console.log(`   ✓ ${table}: ${res.rows.length} filas`);
      } catch (e) {
        console.warn(`   ⚠ ${table}:`, (e as Error).message);
      }
    }
    await localClient.query("SET session_replication_role = DEFAULT");

    console.log("\n✅ Copia completada.");
  } finally {
    await prodClient.end();
    await localClient.end();
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
