/**
 * Script para verificar que la base de datos tenga datos.
 * Ejecutar: npx tsx scripts/check-db.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📊 Verificando base de datos...\n");

  try {
    const [usersCount, rolesCount, patientsCount, labTestsCount, ordersCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.role.count(),
        prisma.patient.count({ where: { deletedAt: null } }),
        prisma.labTest.count({ where: { deletedAt: null } }),
        prisma.labOrder.count(),
      ]);

    console.log("Conteo de registros:");
    console.log("  Usuarios:", usersCount);
    console.log("  Roles:", rolesCount);
    console.log("  Pacientes:", patientsCount);
    console.log("  Análisis (LabTest):", labTestsCount);
    console.log("  Órdenes:", ordersCount);

    if (usersCount === 0) {
      console.log("\n⚠️  No hay usuarios. Ejecuta: npx prisma db seed");
      console.log("   Credenciales por defecto: admin@sistemalis.local / admin123");
    } else {
      const adminUser = await prisma.user.findFirst({
        where: { email: "admin@sistemalis.local" },
        select: { email: true, isActive: true },
      });
      if (adminUser) {
        console.log("\n✅ Usuario admin encontrado:", adminUser.email, adminUser.isActive ? "(activo)" : "(inactivo)");
      } else {
        console.log("\n⚠️  No existe admin@sistemalis.local. Ejecuta el seed.");
      }
    }
  } catch (err) {
    console.error("❌ Error al conectar:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
