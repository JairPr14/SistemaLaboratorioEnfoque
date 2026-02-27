import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_GESTIONAR_ADMISION } from "@/lib/auth";
import { toPatientSelectOption } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/forms/OrderForm";
import { PatientRegistrationModal } from "@/components/admission/PatientRegistrationModal";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";

type Props = { searchParams: Promise<{ patientId?: string }> };

export default async function NuevaAtencionPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!hasPermission(session, PERMISSION_GESTIONAR_ADMISION)) {
    redirect("/admission");
  }
  const { patientId: defaultPatientId } = await searchParams;
  const [patients, recentPatients, tests, profilesData, branches] = await Promise.all([
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
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
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
        title="Nueva atención"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PatientRegistrationModal />
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              href="/admission/pacientes-dia"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
            >
              Pacientes del día
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              href="/admission/resultados"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
            >
              Resultados listos
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              href="/admission/pagos-externos"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
            >
              Pagos externos
            </Link>
          </div>
        }
      />
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
            <OrderForm
              admissionMode
              defaultPatientId={defaultPatientId ?? undefined}
              branches={branches.map((b) => ({ id: b.id, name: b.name }))}
              patients={patients.map(toPatientSelectOption)}
              recentPatients={recentPatients.map(toPatientSelectOption)}
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
