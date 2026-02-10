import { PrismaClient, type LabSection, type ValueType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAIL = "admin@sistemalis.local";
const DEFAULT_USER_PASSWORD = "admin123";

// ---------------------------------------------------------------------------
// Tipos del JSON de plantillas
// ---------------------------------------------------------------------------
interface SeedTemplateItem {
  name: string;
  unit: string | null;
  ref: string | null;
  description: string | null;
  valueType: "TEXT" | "NUMBER" | "SELECT";
  selectOptions: unknown[];
}

interface SeedTemplate {
  templateKey: string;
  analysisName: string;
  section: string | null;
  items: SeedTemplateItem[];
}

// ---------------------------------------------------------------------------
// Normalización (trim, colapsar espacios, SECCION -> SECCIÓN)
// ---------------------------------------------------------------------------
function normalizeStr(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bSECCION\b/gi, "SECCIÓN");
}

/** Clave única del test: templateKey normalizado (usado para upsert por código). */
function toTestCode(templateKey: string): string {
  return normalizeStr(templateKey);
}

/** Mapeo de sección del JSON al enum LabSection. Si es null o no existe -> OTROS. */
const SECTION_MAP: Record<string, LabSection> = {
  BIOQUIMICA: "BIOQUIMICA",
  HEMATOLOGIA: "HEMATOLOGIA",
  INMUNOLOGIA: "INMUNOLOGIA",
  ORINA: "ORINA",
  HECES: "HECES",
  MICROBIOLOGIA: "OTROS",
  "BIOLOGIA MOLECULAR": "OTROS",
};

function toLabSection(section: string | null): LabSection {
  if (section == null || section === "") return "OTROS";
  const normalized = normalizeStr(section)
    .replace(/^SECCIÓN\s+/i, "")
    .trim()
    .toUpperCase();
  return SECTION_MAP[normalized] ?? "OTROS";
}

/** valueType del JSON -> enum ValueType. */
function toValueType(v: string): ValueType {
  const u = (v || "TEXT").toUpperCase();
  if (u === "NUMBER") return "NUMBER";
  if (u === "SELECT") return "SELECT";
  return "TEXT";
}

/** Intenta extraer refMin y refMax de ref (ej: "0.0 - 1.2", "35 - 150"). */
function parseRefRange(ref: string | null): { refMin: number | null; refMax: number | null } {
  if (ref == null || typeof ref !== "string") return { refMin: null, refMax: null };
  const m = ref.match(/^\s*([\d.,]+)\s*[-–]\s*([\d.,]+)\s*$/);
  if (!m) return { refMin: null, refMax: null };
  const a = parseFloat(m[1].replace(",", "."));
  const b = parseFloat(m[2].replace(",", "."));
  if (Number.isNaN(a) || Number.isNaN(b)) return { refMin: null, refMax: null };
  return { refMin: Math.min(a, b), refMax: Math.max(a, b) };
}

// ---------------------------------------------------------------------------
// Carga del JSON (ruta: prisma/plantillas_seed.json o env SEED_JSON_PATH)
// ---------------------------------------------------------------------------
function loadSeedJson(): SeedTemplate[] {
  const defaultPath = path.join(process.cwd(), "prisma", "plantillas_seed.json");
  const envPath = process.env.SEED_JSON_PATH;
  const filePath = envPath ? path.resolve(envPath) : defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró el archivo de plantillas: ${filePath}. Coloca plantillas_seed.json en prisma/ o define SEED_JSON_PATH.`
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("El JSON debe ser un array de plantillas.");
  }
  return data as SeedTemplate[];
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
const summary = {
  sections: new Set<string>(),
  testsCreated: 0,
  testsUpdated: 0,
  templatesCreated: 0,
  templatesUpdated: 0,
  itemsCreated: 0,
  itemsUpdated: 0,
};

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

  const templates = loadSeedJson();

  for (const t of templates) {
    const code = toTestCode(t.templateKey);
    const name = normalizeStr(t.analysisName);
    const section = toLabSection(t.section);

    summary.sections.add(section);

    const testPayload = {
      code,
      name,
      section,
      price: 0,
      estimatedTimeMinutes: null as number | null,
      isActive: true,
    };

    const existingTest = await prisma.labTest.findUnique({ where: { code } });
    const labTest = await prisma.labTest.upsert({
      where: { code },
      update: testPayload,
      create: testPayload,
    });
    if (existingTest) summary.testsUpdated++;
    else summary.testsCreated++;

    const templatePayload = {
      labTestId: labTest.id,
      title: name,
      notes: null as string | null,
    };

    const existingTemplate = await prisma.labTemplate.findUnique({
      where: { labTestId: labTest.id },
    });
    const template = await prisma.labTemplate.upsert({
      where: { labTestId: labTest.id },
      update: { title: templatePayload.title },
      create: templatePayload,
    });
    if (existingTemplate) summary.templatesUpdated++;
    else summary.templatesCreated++;

    for (let i = 0; i < t.items.length; i++) {
      const it = t.items[i];
      const paramName = normalizeStr(it.name);
      const unit = it.unit != null ? normalizeStr(it.unit) : null;
      const refRangeText = it.ref != null ? normalizeStr(it.ref) : null;
      const description = it.description != null ? normalizeStr(it.description) : null;
      const { refMin, refMax } = parseRefRange(it.ref ?? null);
      const valueType = toValueType(it.valueType);
      const selectOptions = JSON.stringify(Array.isArray(it.selectOptions) ? it.selectOptions : []);
      const order = i + 1;

      const existing = await prisma.labTemplateItem.findFirst({
        where: { templateId: template.id, paramName },
      });

      const itemPayload = {
        templateId: template.id,
        paramName,
        unit: unit || null,
        refRangeText: refRangeText || null,
        refMin,
        refMax,
        description: description || null,
        valueType,
        selectOptions,
        order,
      };

      if (existing) {
        await prisma.labTemplateItem.update({
          where: { id: existing.id },
          data: itemPayload,
        });
        summary.itemsUpdated++;
      } else {
        await prisma.labTemplateItem.create({
          data: itemPayload,
        });
        summary.itemsCreated++;
      }
    }
  }

  // Resumen en consola
  console.log("\n--- Resumen del seed de plantillas ---");
  console.log("Secciones (mapeadas a enum):", [...summary.sections].sort().join(", "));
  console.log("Tests creados:", summary.testsCreated);
  console.log("Tests actualizados:", summary.testsUpdated);
  console.log("Plantillas creadas:", summary.templatesCreated);
  console.log("Plantillas actualizadas:", summary.templatesUpdated);
  console.log("Ítems de plantilla creados:", summary.itemsCreated);
  console.log("Ítems de plantilla actualizados:", summary.itemsUpdated);
  console.log("----------------------------------------\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
