import { redirect } from "next/navigation";

import { getServerSession, hasPermission, PERMISSION_GESTIONAR_PLANTILLAS, PERMISSION_CAPTURAR_RESULTADOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pageLayoutClasses } from "@/components/layout/PageHeader";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { TemplatesList } from "@/components/templates/TemplatesList";

export default async function TemplatesPage() {
  const session = await getServerSession();
  const canView =
    session?.user &&
    (hasPermission(session, PERMISSION_GESTIONAR_PLANTILLAS) || hasPermission(session, PERMISSION_CAPTURAR_RESULTADOS));
  if (!canView) {
    redirect("/dashboard");
  }
  const [templates, tests] = await Promise.all([
    prisma.labTemplate.findMany({
      include: { labTest: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.labTest.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const templatesForClient = templates.map((t) => ({
    id: t.id,
    title: t.title,
    testCode: t.labTest.code,
    testName: t.labTest.name,
    itemsCount: t.items.length,
  }));

  const testIdsWithTemplate = new Set(templates.map((t) => t.labTest.id));
  const labTestsForForm = tests.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    hasTemplate: testIdsWithTemplate.has(t.id),
  }));

  return (
    <div className={pageLayoutClasses.wrapper}>
      <div>
        <h1 className={pageLayoutClasses.title}>Plantillas</h1>
        <p className={pageLayoutClasses.description}>
          Define los parámetros de cada análisis para capturar resultados.
        </p>
      </div>

      <TemplatesList templates={templatesForClient} />

      <section className="min-w-0">
        <h2 className={pageLayoutClasses.sectionTitle}>
          Nueva plantilla
        </h2>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
          <TemplateForm key="new" labTests={labTestsForForm} />
        </div>
      </section>
    </div>
  );
}
