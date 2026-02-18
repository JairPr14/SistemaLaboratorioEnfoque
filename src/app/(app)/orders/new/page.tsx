import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/forms/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTION_LABELS: Record<string, string> = {
  BIOQUIMICA: "Bioquímica",
  HEMATOLOGIA: "Hematología",
  INMUNOLOGIA: "Inmunología",
  ORINA: "Orina",
  HECES: "Heces",
  OTROS: "Otros",
};

export default async function NewOrderPage() {
  const [patients, recentPatients, tests, profilesData] = await Promise.all([
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { lastName: "asc" },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.labTest.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ section: "asc" }, { name: "asc" }],
      include: { template: { include: { items: true } } },
    }),
    prisma.testProfile.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { labTest: { select: { id: true, code: true, name: true, section: true, price: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const profiles = profilesData.map((p) => ({
    id: p.id,
    name: p.name,
    packagePrice: p.packagePrice != null ? Number(p.packagePrice) : null,
    tests: p.items.map((i) => ({
      id: i.labTest.id,
      code: i.labTest.code,
      name: i.labTest.name,
      section: i.labTest.section,
      price: Number(i.labTest.price),
    })),
  }));

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Nueva orden
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seleccione el paciente y los análisis a solicitar.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="text-lg">Datos de la orden</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Cada análisis seleccionado incluye su plantilla para capturar resultados.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <OrderForm
            patients={patients.map((p) => ({
              id: p.id,
              label: `${p.lastName} ${p.firstName} (${p.dni})`,
              dni: p.dni,
              firstName: p.firstName,
              lastName: p.lastName,
            }))}
            recentPatients={recentPatients.map((p) => ({
              id: p.id,
              label: `${p.lastName} ${p.firstName} (${p.dni})`,
              dni: p.dni,
              firstName: p.firstName,
              lastName: p.lastName,
            }))}
            tests={tests.map((t) => ({
              id: t.id,
              label: `${t.code} - ${t.name}`,
              code: t.code,
              name: t.name,
              section: t.section,
              sectionLabel: SECTION_LABELS[t.section] ?? t.section,
              price: Number(t.price),
              hasTemplate: !!t.template,
              templateTitle: t.template?.title ?? null,
            }))}
            profiles={profiles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
