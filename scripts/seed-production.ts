/**
 * Script para ejecutar el seed en producción (Neon)
 * 
 * Uso:
 * 1. Configura las variables de entorno de producción en un archivo .env.production
 *    o exporta DATABASE_URL antes de ejecutar:
 * 
 *    export DATABASE_URL="tu-connection-string-de-neon"
 *    pnpm tsx scripts/seed-production.ts
 * 
 * 2. O ejecuta directamente con la variable:
 *    DATABASE_URL="tu-connection-string" pnpm tsx scripts/seed-production.ts
 */

import "dotenv/config";
import { execSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL no está configurada");
  console.log("\nPor favor, configura la variable de entorno:");
  console.log("  export DATABASE_URL='tu-connection-string-de-neon'");
  console.log("\nO ejecuta:");
  console.log("  DATABASE_URL='tu-connection-string' pnpm tsx scripts/seed-production.ts");
  process.exit(1);
}

if (!databaseUrl.includes("neon") && !databaseUrl.includes("postgresql")) {
  console.warn("⚠️  Advertencia: DATABASE_URL no parece ser de Neon/PostgreSQL");
  console.log("¿Estás seguro de que quieres ejecutar el seed en esta base de datos?");
  console.log("DATABASE_URL:", databaseUrl.substring(0, 50) + "...");
}

console.log("🌱 Ejecutando seed en producción...");
console.log("📊 Base de datos:", databaseUrl.includes("neon") ? "Neon" : "PostgreSQL");

try {
  // Ejecutar el seed; DATABASE_URL se pasa por env (compatible con Windows y Unix)
  const output = execSync("pnpm tsx prisma/seed.ts", {
    encoding: "utf-8",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  
  console.log(output);
  console.log("\n✅ Seed ejecutado correctamente!");
  console.log("\n🔐 Credenciales de acceso:");
  console.log("   Email: admin@sistemalis.local");
  console.log("   Contraseña: admin123");
  console.log("\n⚠️  IMPORTANTE: Cambia la contraseña después del primer acceso!");
} catch (error: any) {
  console.error("\n❌ Error al ejecutar el seed");
  if (error.stdout) console.error("STDOUT:", error.stdout);
  if (error.stderr) console.error("STDERR:", error.stderr);
  if (error.message) console.error("Error:", error.message);
  process.exit(1);
}
