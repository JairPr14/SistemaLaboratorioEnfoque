import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/forms/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { searchParams: Promise<{ patientId?: string }> };

export default async function NewOrderPage({ searchParams }: Props) {
  const { patientId: defaultPatientId } = await searchParams;
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
      include: { template: { include: { items: true } }, section: true },
      orderBy: [{ section: { order: "asc" } }, { name: "asc" }],
    }),
    prisma.testProfile.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { labTest: { include: { section: true } } },
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
      section: i.labTest.section?.code ?? "",
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
            defaultPatientId={defaultPatientId ?? undefined}
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
              section: t.section?.code ?? "",
              sectionLabel: t.section?.name ?? t.section?.code ?? "",
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
