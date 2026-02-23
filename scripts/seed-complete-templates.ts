import "dotenv/config";
import { PrismaClient, type ValueType } from "@prisma/client";

const prisma = new PrismaClient();

type SectionDefaults = {
  unit: string | null;
  refRangeText: string | null;
  valueType: ValueType;
};

const SECTION_DEFAULTS: Record<string, SectionDefaults> = {
  BIOQUIMICA: { unit: "mg/dL", refRangeText: "Ver referencia del método", valueType: "NUMBER" },
  HEMATOLOGIA: { unit: null, refRangeText: "Ver referencia por edad/sexo", valueType: "TEXT" },
  INMUNOLOGIA: { unit: null, refRangeText: "Reactivo / No reactivo", valueType: "TEXT" },
  ORINA: { unit: null, refRangeText: "Ver referencia del método", valueType: "TEXT" },
  HECES: { unit: null, refRangeText: "Negativo", valueType: "TEXT" },
  OTROS: { unit: null, refRangeText: "Ver referencia del método", valueType: "TEXT" },
};

function normalizeTitle(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function ensureTemplateForTest(testId: string) {
  const test = await prisma.labTest.findUnique({
    where: { id: testId },
    include: {
      section: true,
      template: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!test || test.deletedAt || !test.isActive) return { createdTemplate: false, createdItem: false };

  const sectionCode = test.section?.code ?? "OTROS";
  const defaults = SECTION_DEFAULTS[sectionCode] ?? SECTION_DEFAULTS.OTROS;
  const title = normalizeTitle(test.name);

  if (!test.template) {
    await prisma.labTemplate.create({
      data: {
        labTestId: test.id,
        title,
        notes: "Plantilla generada automáticamente. Ajustar parámetros de referencia.",
        items: {
          create: [
            {
              paramName: "RESULTADO",
              groupName: null,
              unit: defaults.unit,
              refRangeText: defaults.refRangeText,
              refMin: null,
              refMax: null,
              description: "Campo base generado automáticamente",
              valueType: defaults.valueType,
              selectOptions: "[]",
              order: 1,
            },
          ],
        },
      },
    });
    return { createdTemplate: true, createdItem: true };
  }

  if (test.template.items.length === 0) {
    await prisma.labTemplateItem.create({
      data: {
        templateId: test.template.id,
        paramName: "RESULTADO",
        groupName: null,
        unit: defaults.unit,
        refRangeText: defaults.refRangeText,
        refMin: null,
        refMax: null,
        description: "Campo base generado automáticamente",
        valueType: defaults.valueType,
        selectOptions: "[]",
        order: 1,
      },
    });
    return { createdTemplate: false, createdItem: true };
  }

  return { createdTemplate: false, createdItem: false };
}

async function main() {
  const tests = await prisma.labTest.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true },
  });

  let templatesCreated = 0;
  let itemsCreated = 0;

  for (const test of tests) {
    const result = await ensureTemplateForTest(test.id);
    if (result.createdTemplate) templatesCreated++;
    if (result.createdItem) itemsCreated++;
  }

  console.log("Seed de plantillas completado.");
  console.log(`Plantillas creadas: ${templatesCreated}`);
  console.log(`Ítems base creados: ${itemsCreated}`);
}

main()
  .catch((error) => {
    console.error("Error al completar plantillas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
