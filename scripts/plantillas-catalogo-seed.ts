/**
 * Seed: Catálogo de análisis, plantillas y pacientes
 * Ejecutar: pnpm db:seed:plantillas-catalogo
 *
 * Crea:
 * - Secciones (LabSection)
 * - Análisis (LabTest)
 * - Plantillas (LabTemplate + LabTemplateItem)
 * - Pacientes (Patient)
 */
import "dotenv/config";
import { PrismaClient, type Sex, type ValueType } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Secciones ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { code: "BIOQUIMICA", name: "Bioquímica", order: 1 },
  { code: "HEMATOLOGIA", name: "Hematología", order: 2 },
  { code: "INMUNOLOGIA", name: "Inmunología", order: 3 },
  { code: "ORINA", name: "Orina", order: 4 },
  { code: "HECES", name: "Heces", order: 5 },
  { code: "OTROS", name: "Otros", order: 6 },
];

// ─── Análisis por sección: { sectionCode, code, name, price, items? }
type TemplateItemSeed = { paramName: string; unit: string | null; refRangeText: string | null; refMin?: number; refMax?: number; valueType: ValueType; order: number };
type TestSeed = {
  sectionCode: string;
  code: string;
  name: string;
  price: number;
  estimatedTimeMinutes?: number;
  templateItems?: TemplateItemSeed[];
};

const TESTS: TestSeed[] = [
  // Bioquímica
  { sectionCode: "BIOQUIMICA", code: "GLUCOSA", name: "Glucosa", price: 8, estimatedTimeMinutes: 30, templateItems: [{ paramName: "Glucosa", unit: "mg/dL", refRangeText: "70-100", refMin: 70, refMax: 100, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "BIOQUIMICA", code: "CREATININA", name: "Creatinina", price: 12, estimatedTimeMinutes: 30, templateItems: [{ paramName: "Creatinina", unit: "mg/dL", refRangeText: "0.7-1.2 (M), 0.6-1.1 (F)", refMin: 0.6, refMax: 1.2, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "BIOQUIMICA", code: "UREA", name: "Urea", price: 10, estimatedTimeMinutes: 30, templateItems: [{ paramName: "Urea", unit: "mg/dL", refRangeText: "15-45", refMin: 15, refMax: 45, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "BIOQUIMICA", code: "COLESTEROL-TOTAL", name: "Colesterol Total", price: 15, estimatedTimeMinutes: 45, templateItems: [{ paramName: "Colesterol Total", unit: "mg/dL", refRangeText: "< 200", refMax: 200, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "BIOQUIMICA", code: "TRIGLICERIDOS", name: "Triglicéridos", price: 15, estimatedTimeMinutes: 45, templateItems: [{ paramName: "Triglicéridos", unit: "mg/dL", refRangeText: "< 150", refMax: 150, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "BIOQUIMICA", code: "PERFIL-LIPIDICO", name: "Perfil lipídico", price: 35, estimatedTimeMinutes: 60, templateItems: [
    { paramName: "Colesterol Total", unit: "mg/dL", refRangeText: "< 200", refMax: 200, valueType: "NUMBER", order: 1 },
    { paramName: "Colesterol LDL", unit: "mg/dL", refRangeText: "< 100", refMax: 100, valueType: "NUMBER", order: 2 },
    { paramName: "Colesterol HDL", unit: "mg/dL", refRangeText: "> 40 (M), > 50 (F)", refMin: 40, valueType: "NUMBER", order: 3 },
    { paramName: "Triglicéridos", unit: "mg/dL", refRangeText: "< 150", refMax: 150, valueType: "NUMBER", order: 4 },
  ]},
  // Hematología
  { sectionCode: "HEMATOLOGIA", code: "HEMOGLOBINA", name: "Hemoglobina", price: 10, estimatedTimeMinutes: 30, templateItems: [{ paramName: "Hemoglobina", unit: "g/dL", refRangeText: "12-16 (F), 14-18 (M)", refMin: 12, refMax: 18, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "HEMATOLOGIA", code: "HEMATOCRITO", name: "Hematocrito", price: 8, estimatedTimeMinutes: 30, templateItems: [{ paramName: "Hematocrito", unit: "%", refRangeText: "36-46 (F), 42-52 (M)", refMin: 36, refMax: 52, valueType: "NUMBER", order: 1 }] },
  { sectionCode: "HEMATOLOGIA", code: "HEMATOLOGIA-COMPLETA", name: "Hematología completa", price: 25, estimatedTimeMinutes: 60, templateItems: [
    { paramName: "Hemoglobina", unit: "g/dL", refRangeText: "12-18", refMin: 12, refMax: 18, valueType: "NUMBER", order: 1 },
    { paramName: "Hematocrito", unit: "%", refRangeText: "36-52", refMin: 36, refMax: 52, valueType: "NUMBER", order: 2 },
    { paramName: "Leucocitos", unit: "/mm³", refRangeText: "4000-11000", refMin: 4000, refMax: 11000, valueType: "NUMBER", order: 3 },
    { paramName: "Plaquetas", unit: "/mm³", refRangeText: "150000-400000", refMin: 150000, refMax: 400000, valueType: "NUMBER", order: 4 },
  ]},
  // Inmunología
  { sectionCode: "INMUNOLOGIA", code: "COVID-IGG", name: "COVID-19 IgG", price: 35, estimatedTimeMinutes: 60, templateItems: [{ paramName: "Resultado", unit: null, refRangeText: "Reactivo / No reactivo", valueType: "TEXT", order: 1 }] },
  { sectionCode: "INMUNOLOGIA", code: "VIH", name: "VIH (Elisa)", price: 45, estimatedTimeMinutes: 120, templateItems: [{ paramName: "Resultado", unit: null, refRangeText: "Reactivo / No reactivo", valueType: "TEXT", order: 1 }] },
  // Orina
  { sectionCode: "ORINA", code: "ORINA-COMPLETA", name: "Orina completa", price: 15, estimatedTimeMinutes: 45, templateItems: [
    { paramName: "Aspecto", unit: null, refRangeText: "Limpido", valueType: "TEXT", order: 1 },
    { paramName: "Color", unit: null, refRangeText: "Amarillo claro", valueType: "TEXT", order: 2 },
    { paramName: "pH", unit: null, refRangeText: "4.5-8.0", refMin: 4.5, refMax: 8, valueType: "NUMBER", order: 3 },
  ]},
  // Heces
  { sectionCode: "HECES", code: "COPROPARASITARIO", name: "Coprología / Parasitológico", price: 20, estimatedTimeMinutes: 60, templateItems: [{ paramName: "Resultado", unit: null, refRangeText: "Negativo", valueType: "TEXT", order: 1 }] },
];

// ─── Pacientes ─────────────────────────────────────────────────────────────
type PatientSeed = { dni: string; firstName: string; lastName: string; birthDate: string; sex: Sex; phone?: string; address?: string };
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
  const base = lastCode && lastCode.startsWith("PAC-") ? parseInt(lastCode.slice(4), 10) || 0 : 0;
  return `PAC-${String(base + offset).padStart(4, "0")}`;
}

async function main() {
  console.log("🌱 Iniciando plantillas-catalogo-seed...\n");

  // 1. Secciones
  const sectionIds: Record<string, string> = {};
  for (const s of SECTIONS) {
    const sec = await prisma.labSection.upsert({
      where: { code: s.code },
      update: { name: s.name, order: s.order, isActive: true },
      create: { code: s.code, name: s.name, order: s.order, isActive: true },
    });
    sectionIds[s.code] = sec.id;
  }
  console.log(`✓ Secciones: ${SECTIONS.length} (${Object.keys(sectionIds).join(", ")})`);

  // 2. Análisis y plantillas
  let testsCreated = 0;
  let templatesCreated = 0;
  for (const t of TESTS) {
    const sectionId = sectionIds[t.sectionCode] ?? sectionIds.OTROS;
    const test = await prisma.labTest.upsert({
      where: { code: t.code },
      update: { name: t.name, price: t.price, sectionId, estimatedTimeMinutes: t.estimatedTimeMinutes ?? null, isActive: true, deletedAt: null },
      create: { code: t.code, name: t.name, price: t.price, sectionId, estimatedTimeMinutes: t.estimatedTimeMinutes ?? null, isActive: true },
    });
    testsCreated++;

    const existingTemplate = await prisma.labTemplate.findUnique({ where: { labTestId: test.id }, include: { items: true } });
    const items = t.templateItems ?? [{ paramName: "RESULTADO", unit: null, refRangeText: "Ver referencia del método", valueType: "TEXT" as ValueType, order: 1 }];

    if (!existingTemplate) {
      await prisma.labTemplate.create({
        data: {
          labTestId: test.id,
          title: t.name,
          notes: "Plantilla del seed",
          isVerified: false,
          items: {
            create: items.map((it) => ({
              paramName: it.paramName,
              groupName: null,
              unit: it.unit,
              refRangeText: it.refRangeText,
              refMin: it.refMin ?? null,
              refMax: it.refMax ?? null,
              valueType: it.valueType,
              selectOptions: "[]",
              order: it.order,
            })),
          },
        },
      });
      templatesCreated++;
    } else if (existingTemplate.items.length === 0) {
      await prisma.labTemplateItem.createMany({
        data: items.map((it) => ({
          templateId: existingTemplate.id,
          paramName: it.paramName,
          groupName: null,
          unit: it.unit,
          refRangeText: it.refRangeText,
          refMin: it.refMin ?? null,
          refMax: it.refMax ?? null,
          valueType: it.valueType,
          selectOptions: "[]",
          order: it.order,
        })),
      });
      templatesCreated++;
    }
  }
  console.log(`✓ Análisis: ${testsCreated}`);
  console.log(`✓ Plantillas: ${templatesCreated}`);

  // 3. Pacientes
  const lastPatient = await prisma.patient.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true } });
  let patientsCreated = 0;
  let offset = 1;
  for (const p of PATIENTS) {
    const existing = await prisma.patient.findUnique({ where: { dni: p.dni } });
    if (!existing) {
      await prisma.patient.create({
        data: {
          code: nextPatientCode(lastPatient?.code ?? null, offset),
          dni: p.dni,
          firstName: p.firstName.toUpperCase(),
          lastName: p.lastName.toUpperCase(),
          birthDate: new Date(p.birthDate),
          sex: p.sex,
          phone: p.phone ?? null,
          address: p.address ?? null,
        },
      });
      patientsCreated++;
      offset++;
    }
  }
  console.log(`✓ Pacientes: ${patientsCreated} creados`);

  console.log("\n✅ plantillas-catalogo-seed completado.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
