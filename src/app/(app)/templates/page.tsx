import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageLayoutClasses } from "@/components/layout/PageHeader";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { TemplatesList } from "@/components/templates/TemplatesList";

export default async function TemplatesPage() {
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar plantilla al catálogo</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Elige un análisis y define sus parámetros.
            </p>
          </CardHeader>
          <CardContent>
            <TemplateForm labTests={labTestsForForm} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
