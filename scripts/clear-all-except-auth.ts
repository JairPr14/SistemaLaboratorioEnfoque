import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteIfExists(tx: any, model: string, label: string): Promise<number> {
  try {
    const result = await tx[model]?.deleteMany({});
    const count = result?.count ?? 0;
    if (count > 0) console.log(`  ✓ Eliminados ${count} ${label}`);
    return count;
  } catch (error: any) {
    if (error?.code === "P2021") {
      // Tabla no existe, está bien
      return 0;
    }
    throw error;
  }
}

async function main() {
  console.log("Limpiando base de datos (manteniendo usuarios y roles)...\n");
  
  await prisma.$transaction(async (tx) => {
    // Eliminar en orden de dependencias (hijos primero)
    await deleteIfExists(tx, "userFavoriteTest", "favoritos de usuarios");
    await deleteIfExists(tx, "testProfileItem", "items de perfiles");
    await deleteIfExists(tx, "testProfile", "perfiles de prueba");
    await deleteIfExists(tx, "labResultItem", "items de resultados");
    await deleteIfExists(tx, "labResult", "resultados");
    await deleteIfExists(tx, "labOrderItem", "items de órdenes");
    await deleteIfExists(tx, "labOrder", "órdenes");
    await deleteIfExists(tx, "labTemplateItem", "items de plantillas");
    await deleteIfExists(tx, "labTemplate", "plantillas");
    await deleteIfExists(tx, "labTest", "análisis");
    await deleteIfExists(tx, "patient", "pacientes");
  });
  
  // Verificar qué se mantuvo
  const usersCount = await prisma.user.count();
  const rolesCount = await prisma.role.count();
  
  console.log("\n✅ Base de datos limpiada.");
  console.log(`\n📊 Datos mantenidos:`);
  console.log(`   - ${usersCount} usuario(s)`);
  console.log(`   - ${rolesCount} rol(es)`);
  console.log("\n💡 Puedes empezar a llenar con datos nuevos.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
