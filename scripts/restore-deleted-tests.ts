/**
 * Restaura análisis eliminados (soft delete): pone deletedAt = null e isActive = true
 * Ejecutar: pnpm tsx scripts/restore-deleted-tests.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.labTest.updateMany({
    where: { deletedAt: { not: null } },
    data: { deletedAt: null, isActive: true },
  });

  console.log(`\n✓ Restaurados ${result.count} análisis (deletedAt=null, isActive=true)\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
