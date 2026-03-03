import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAIL = "admin@sistemalis.local";
const DEFAULT_USER_PASSWORD = "admin123";

async function main() {
  // Roles iniciales (upsert por code)
  const rolesSeed = [
    { code: "ADMIN", name: "Administrador", description: "Acceso total al sistema" },
    { code: "LAB", name: "Laboratorio", description: "Registro de resultados y plantillas" },
    { code: "RECEPTION", name: "Recepción", description: "Pacientes y órdenes" },
  ];
  for (const r of rolesSeed) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description ?? null },
      create: { code: r.code, name: r.name, description: r.description ?? null, isActive: true },
    });
  }
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  if (!adminRole) throw new Error("Rol ADMIN no encontrado tras seed");

  // Usuario inicial para login (solo si no existe)
  const existingUser = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  });
  if (!existingUser) {
    const passwordHash = await hash(DEFAULT_USER_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        passwordHash,
        name: "Administrador",
        isActive: true,
        roleId: adminRole.id,
      },
    });
    console.log("Usuario inicial creado:", DEFAULT_USER_EMAIL, "con rol ADMIN");
  }

  // Tipos de descuento para planilla (AFP, ONP en ambas quincenas; Adelanto y Préstamo en una sola)
  const discountTypes = [
    { code: "AFP", name: "AFP", splitAcrossQuincenas: true, order: 0 },
    { code: "ONP", name: "ONP", splitAcrossQuincenas: true, order: 1 },
    { code: "ADELANTO", name: "Adelanto", splitAcrossQuincenas: false, order: 2 },
    { code: "PRESTAMO", name: "Préstamo", splitAcrossQuincenas: false, order: 3 },
  ];
  for (const dt of discountTypes) {
    await prisma.discountType.upsert({
      where: { code: dt.code },
      update: { name: dt.name, splitAcrossQuincenas: dt.splitAcrossQuincenas, order: dt.order },
      create: { code: dt.code, name: dt.name, splitAcrossQuincenas: dt.splitAcrossQuincenas, order: dt.order, isActive: true },
    });
  }
  console.log("Tipos de descuento (AFP, ONP, Adelanto, Préstamo) configurados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
