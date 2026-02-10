import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogTestsList } from "@/components/catalog/CatalogTestsList";

export default async function TestsPage() {
  const tests = await prisma.labTest.findMany({
    where: { deletedAt: null },
    orderBy: [{ section: "asc" }, { name: "asc" }],
  });

  const testsForClient = tests.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    section: t.section,
    price: Number(t.price),
  }));

  return (
    <div className="space-y-8 min-w-0">
      {/* 1. Catálogo de análisis + buscador */}
      <CatalogTestsList tests={testsForClient} />

      {/* 2. Nuevo análisis */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Nuevo análisis
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar análisis al catálogo</CardTitle>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Código, nombre, sección y precio.
            </p>
          </CardHeader>
          <CardContent>
            <LabTestForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
