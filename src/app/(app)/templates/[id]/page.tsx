import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, PERMISSION_GESTIONAR_PLANTILLAS, PERMISSION_CAPTURAR_RESULTADOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSelectOptions } from "@/lib/json-helpers";

type Props = { params: Promise<{ id: string }> };

export default async function TemplateDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const canView =
    session?.user &&
    (hasPermission(session, PERMISSION_GESTIONAR_PLANTILLAS) || hasPermission(session, PERMISSION_CAPTURAR_RESULTADOS));
  if (!canView) {
    redirect("/dashboard");
  }
  const { id } = await params;
  const [template, tests] = await Promise.all([
    prisma.labTemplate.findFirst({
      where: { id },
      include: {
        labTest: true,
        items: {
          include: { refRanges: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.labTest.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/templates"
          className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
        >
          Plantillas
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
          {template.title}
        </span>
      </nav>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Editar plantilla</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
            {template.labTest.code} · {template.labTest.name}
          </p>
        </CardHeader>
        <CardContent>
          <TemplateForm
            key={template.id}
            templateId={template.id}
            labTests={tests.map((test) => ({
              id: test.id,
              name: test.name,
              code: test.code,
            }))}
            defaultValues={{
              labTestId: template.labTestId,
              title: template.title,
              notes: template.notes ?? "",
              items: template.items.map((item) => ({
                groupName: item.groupName ?? "",
                paramName: item.paramName,
                unit: item.unit ?? "",
                refRangeText: item.refRangeText ?? "",
                refMin: item.refMin ? Number(item.refMin) : undefined,
                refMax: item.refMax ? Number(item.refMax) : undefined,
                valueType: item.valueType as "TEXT" | "NUMBER" | "SELECT" | "DECIMAL" | "PERCENTAGE",
                selectOptions: parseSelectOptions(item.selectOptions),
                order: item.order,
                refRanges: (item.refRanges ?? []).map((r) => ({
                  id: r.id,
                  ageGroup: (r.ageGroup === "NIÑOS" || r.ageGroup === "JOVENES" || r.ageGroup === "ADULTOS") 
                    ? r.ageGroup 
                    : null,
                  sex: r.sex,
                  refRangeText: r.refRangeText ?? "",
                  refMin: r.refMin ?? undefined,
                  refMax: r.refMax ?? undefined,
                  order: r.order ?? 0,
                })),
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
