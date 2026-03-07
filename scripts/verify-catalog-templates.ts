/**
 * Verifica estado de análisis vs plantillas en la BD
 * Ejecutar: pnpm tsx scripts/verify-catalog-templates.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Consultas secuenciales para evitar "too many connections" en BD con límite bajo
  const tests = await prisma.labTest.count({ where: { deletedAt: null } });
  const templates = await prisma.labTemplate.count();
  const testsDeleted = await prisma.labTest.count({ where: { deletedAt: { not: null } } });
  const templatesOrphaned = await prisma.labTemplate.findMany({
    include: { labTest: { select: { id: true, code: true, name: true, deletedAt: true } } },
  });

  console.log("\n=== Estado del catálogo ===\n");
  console.log("Análisis activos (deletedAt: null):", tests);
  console.log("Análisis eliminados (deletedAt no null):", testsDeleted);
  console.log("Plantillas totales:", templates);

  const orphaned = templatesOrphaned.filter((t) => t.labTest.deletedAt != null);
  if (orphaned.length > 0) {
    console.log("\n⚠ Plantillas cuyo análisis está ELIMINADO (no aparecen en catálogo):");
    orphaned.forEach((t) => {
      console.log(`  - ${t.labTest.code} / ${t.labTest.name} (plantilla: ${t.title})`);
    });
  }

  const ok = templatesOrphaned.filter((t) => t.labTest.deletedAt == null);
  if (ok.length > 0) {
    console.log("\n✓ Plantillas con análisis activo:", ok.length);
  }

  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
