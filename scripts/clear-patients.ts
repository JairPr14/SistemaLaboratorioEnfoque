import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Eliminando todos los datos relacionados...");
  
  await prisma.$transaction(async (tx) => {
    // 1. Eliminar resultados y sus items
    const resultItems = await tx.labResultItem.deleteMany({});
    console.log(`  - Eliminados ${resultItems.count} items de resultados`);
    
    const results = await tx.labResult.deleteMany({});
    console.log(`  - Eliminados ${results.count} resultados`);
    
    // 2. Eliminar items de órdenes
    const orderItems = await tx.labOrderItem.deleteMany({});
    console.log(`  - Eliminados ${orderItems.count} items de órdenes`);
    
    // 3. Eliminar órdenes
    const orders = await tx.labOrder.deleteMany({});
    console.log(`  - Eliminados ${orders.count} órdenes`);
    
    // 4. Finalmente eliminar pacientes
    const patients = await tx.patient.deleteMany({});
    console.log(`  - Eliminados ${patients.count} pacientes`);
  });
  
  console.log("\n✅ Base de datos limpiada. Puedes empezar desde cero.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
