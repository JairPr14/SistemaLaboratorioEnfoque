import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_VER_CATALOGO, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_EDITAR_PRECIO_CATALOGO } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageLayoutClasses } from "@/components/layout/PageHeader";
import { CatalogTestsList } from "@/components/catalog/CatalogTestsList";

export default async function TestsPage() {
  const session = await getServerSession();
  const canView =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_CATALOGO) ||
      hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) ||
      hasPermission(session, PERMISSION_EDITAR_PRECIO_CATALOGO));
  if (!canView) {
    redirect("/dashboard");
  }
  const canManageCatalog = hasPermission(session, PERMISSION_GESTIONAR_CATALOGO);
  const canEditPrice = hasPermission(session, PERMISSION_EDITAR_PRECIO_CATALOGO);
  const canEditOrCreate = canManageCatalog || canEditPrice;
  const tests = await prisma.labTest.findMany({
    where: { deletedAt: null },
    include: { section: true },
    orderBy: [{ section: { order: "asc" } }, { name: "asc" }],
  });

  const testsForClient = tests.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    section: t.section?.code ?? "",
    sectionName: t.section?.name ?? "",
    sectionId: t.sectionId,
    price: Number(t.price),
  }));

  const [sections, referredLabsRes] = await Promise.all([
    prisma.labSection.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.referredLab.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className={pageLayoutClasses.wrapper}>
      <CatalogTestsList
        tests={testsForClient}
        canEdit={canEditOrCreate}
        canDelete={canManageCatalog}
      />

      {canManageCatalog && (
      <section className="min-w-0">
        <h2 className={pageLayoutClasses.sectionTitle}>
          Nuevo análisis
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar análisis al catálogo</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Código, nombre, sección y precio.
            </p>
          </CardHeader>
          <CardContent>
            <LabTestForm
              sections={sections.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
              referredLabs={referredLabsRes.map((l) => ({ id: l.id, name: l.name }))}
            />
          </CardContent>
        </Card>
      </section>
      )}
    </div>
  );
}
