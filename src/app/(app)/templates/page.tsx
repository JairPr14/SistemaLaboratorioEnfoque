import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-8 min-w-0">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Plantillas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Define los parámetros de cada análisis para capturar resultados.
        </p>
      </div>

      {/* 1. Catálogo de plantillas + buscador */}
      <TemplatesList templates={templatesForClient} />

      {/* 2. Nueva plantilla */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Nueva plantilla
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar plantilla al catálogo</CardTitle>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Elige un análisis y define sus parámetros.
            </p>
          </CardHeader>
          <CardContent>
            <TemplateForm
              labTests={tests.map((t) => ({
                id: t.id,
                name: t.name,
                code: t.code,
              }))}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
