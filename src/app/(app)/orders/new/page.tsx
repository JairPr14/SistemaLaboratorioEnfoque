import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, PERMISSION_VER_ORDENES, PERMISSION_GESTIONAR_ADMISION } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/forms/OrderForm";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";

type Props = { searchParams: Promise<{ patientId?: string }> };

export default async function NewOrderPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const canCreate =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_ORDENES) || hasPermission(session, PERMISSION_GESTIONAR_ADMISION));
  if (!canCreate) {
    redirect("/dashboard");
  }
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
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Nueva orden"
        description="Seleccione el paciente y los análisis a solicitar. Cada análisis incluye su plantilla para capturar resultados."
      />
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
        <OrderForm
            defaultPatientId={defaultPatientId ?? undefined}
            patients={patients.map((p) => ({
              id: p.id,
              label: `${p.lastName} ${p.firstName} (${p.dni ?? "—"})`,
              dni: p.dni,
              firstName: p.firstName,
              lastName: p.lastName,
            }))}
            recentPatients={recentPatients.map((p) => ({
              id: p.id,
              label: `${p.lastName} ${p.firstName} (${p.dni ?? "—"})`,
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
      </div>
    </div>
  );
}
