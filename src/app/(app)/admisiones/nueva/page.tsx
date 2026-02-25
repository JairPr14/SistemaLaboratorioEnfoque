import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { formatPatientDisplayName } from "@/lib/format";
import {
  authOptions,
  hasPermission,
  PERMISSION_AJUSTAR_PRECIO_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
} from "@/lib/auth";
import { AdmissionForm } from "@/components/admisiones/AdmissionForm";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";

export default async function NuevaAdmisionPage() {
  const session = await getServerSession(authOptions);
  const canManage = hasPermission(session, PERMISSION_GESTIONAR_ADMISION);
  const canAdjustPrice = hasPermission(session, PERMISSION_AJUSTAR_PRECIO_ADMISION);

  if (!canManage) {
    redirect("/admisiones");
  }

  const [patients, tests, profilesData, branches] = await Promise.all([
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.labTest.findMany({
      where: { deletedAt: null, isActive: true },
      include: { section: true },
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

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Nueva orden de admisión"
        description="Registra datos del paciente (existente o nuevo) y análisis solicitados. Se crea la orden en laboratorio automáticamente."
      />
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
        <AdmissionForm
          canAdjustPrice={canAdjustPrice}
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          patients={patients.map((patient) => ({
              id: patient.id,
              label: `${formatPatientDisplayName(patient.firstName, patient.lastName)} (${patient.dni})`,
              dni: patient.dni,
              firstName: patient.firstName,
              lastName: patient.lastName,
            }))}
          tests={tests.map((test) => ({
              id: test.id,
              code: test.code,
              name: test.name,
              sectionLabel: test.section?.name ?? test.section?.code ?? "",
              price: Number(test.price),
            }))}
          profiles={profilesData.map((profile) => ({
              id: profile.id,
              name: profile.name,
              packagePrice: profile.packagePrice != null ? Number(profile.packagePrice) : null,
              tests: profile.items.map((item) => ({
                id: item.labTest.id,
                code: item.labTest.code,
                name: item.labTest.name,
                price: Number(item.labTest.price),
              })),
            }))}
        />
      </div>
    </div>
  );
}
