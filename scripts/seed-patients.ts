import "dotenv/config";
import { PrismaClient, type Sex } from "@prisma/client";

const prisma = new PrismaClient();

type PatientSeed = {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: Sex;
  phone?: string;
  address?: string;
};

const PATIENTS: PatientSeed[] = [
  { dni: "70123456", firstName: "Ana Lucia", lastName: "Quispe Rojas", birthDate: "1992-03-14", sex: "F", phone: "987654321", address: "Av. Los Pinos 120" },
  { dni: "71234567", firstName: "Carlos Eduardo", lastName: "Mamani Huanca", birthDate: "1988-11-22", sex: "M", phone: "976543210", address: "Jr. Ayacucho 450" },
  { dni: "72345678", firstName: "Mariana", lastName: "Torres Cardenas", birthDate: "1995-07-08", sex: "F", phone: "965432109", address: "Calle Lima 89" },
  { dni: "73456789", firstName: "Jose Luis", lastName: "Perez Cusi", birthDate: "1983-09-30", sex: "M", phone: "954321098", address: "Psje. Flores 310" },
  { dni: "74567890", firstName: "Daniela", lastName: "Gomez Arias", birthDate: "2001-01-16", sex: "F", phone: "943210987", address: "Av. Central 540" },
  { dni: "75678901", firstName: "Miguel Angel", lastName: "Flores Diaz", birthDate: "1979-12-05", sex: "M", phone: "932109876", address: "Jr. Unión 210" },
  { dni: "76789012", firstName: "Valeria", lastName: "Santos Vilca", birthDate: "1998-05-25", sex: "F", phone: "921098765", address: "Calle Comercio 102" },
  { dni: "77890123", firstName: "Ruben", lastName: "Condori Ticona", birthDate: "1986-08-11", sex: "M", phone: "910987654", address: "Av. Progreso 78" },
  { dni: "78901234", firstName: "Luciana", lastName: "Ramos Calderon", birthDate: "1990-04-19", sex: "F", phone: "998877665", address: "Jr. Libertad 12" },
  { dni: "79012345", firstName: "Fernando", lastName: "Choque Poma", birthDate: "1984-10-27", sex: "M", phone: "987112233", address: "Urb. San Martin Mz B Lt 4" },
];

function nextPatientCode(lastCode: string | null, offset: number): string {
  const base = (() => {
    if (!lastCode || !lastCode.startsWith("PAC-")) return 0;
    const n = parseInt(lastCode.slice(4), 10);
    return Number.isNaN(n) ? 0 : n;
  })();
  return `PAC-${String(base + offset).padStart(4, "0")}`;
}

async function main() {
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  let created = 0;
  let updated = 0;
  let offset = 1;

  for (const patient of PATIENTS) {
    const existing = await prisma.patient.findUnique({
      where: { dni: patient.dni },
      select: { id: true, deletedAt: true },
    });

    if (existing) {
      await prisma.patient.update({
        where: { dni: patient.dni },
        data: {
          firstName: patient.firstName.toUpperCase(),
          lastName: patient.lastName.toUpperCase(),
          birthDate: new Date(patient.birthDate),
          sex: patient.sex,
          phone: patient.phone ?? null,
          address: patient.address ?? null,
          deletedAt: null,
        },
      });
      updated++;
      continue;
    }

    await prisma.patient.create({
      data: {
        code: nextPatientCode(lastPatient?.code ?? null, offset),
        dni: patient.dni,
        firstName: patient.firstName.toUpperCase(),
        lastName: patient.lastName.toUpperCase(),
        birthDate: new Date(patient.birthDate),
        sex: patient.sex,
        phone: patient.phone ?? null,
        address: patient.address ?? null,
      },
    });
    created++;
    offset++;
  }

  console.log(`Seed de pacientes completado. Creados: ${created}, actualizados: ${updated}`);
}

main()
  .catch((error) => {
    console.error("Error en seed de pacientes:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
