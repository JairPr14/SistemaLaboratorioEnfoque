import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_VER_CATALOGO, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_EDITAR_PRECIO_CATALOGO } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function TestDetailPage({ params }: Props) {
  const session = await getServerSession();
  const canEdit =
    session?.user &&
    (hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) ||
      hasPermission(session, PERMISSION_EDITAR_PRECIO_CATALOGO));
  if (!canEdit) {
    redirect("/catalog/tests");
  }
  const { id } = await params;
  const [test, sections, referredLabsRes] = await Promise.all([
    prisma.labTest.findFirst({
      where: { id, deletedAt: null },
      include: {
        section: true,
        referredLab: true,
        referredLabOptions: true,
      },
    }),
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

  if (!test) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/catalog/tests"
          className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
        >
          Catálogo
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
          {test.name}
        </span>
      </nav>
    <Card>
      <CardHeader>
        <CardTitle>Editar análisis</CardTitle>
      </CardHeader>
      <CardContent>
        <LabTestForm
          testId={test.id}
          sections={sections.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
          referredLabs={referredLabsRes.map((l) => ({ id: l.id, name: l.name }))}
          defaultValues={{
            code: test.code,
            name: test.name,
            sectionId: test.sectionId,
            price: Number(test.price),
            estimatedTimeMinutes: test.estimatedTimeMinutes ?? undefined,
            isActive: test.isActive,
            isReferred: test.isReferred,
            referredLabId: test.referredLabId ?? null,
            priceToAdmission: test.priceToAdmission != null ? Number(test.priceToAdmission) : null,
            externalLabCost: test.externalLabCost != null ? Number(test.externalLabCost) : null,
            referredLabOptions: (test.referredLabOptions ?? []).map((opt) => ({
              id: opt.id,
              referredLabId: opt.referredLabId,
              priceToAdmission: opt.priceToAdmission != null ? Number(opt.priceToAdmission) : null,
              externalLabCost: opt.externalLabCost != null ? Number(opt.externalLabCost) : null,
              isDefault: opt.isDefault,
            })),
          }}
        />
      </CardContent>
    </Card>
    </div>
  );
}
