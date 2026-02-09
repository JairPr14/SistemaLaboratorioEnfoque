import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSelectOptions } from "@/lib/json-helpers";

type Props = { params: { id: string } };

export default async function TemplateDetailPage({ params }: Props) {
  const [template, tests] = await Promise.all([
    prisma.labTemplate.findFirst({
      where: { id: params.id },
      include: { items: { orderBy: { order: "asc" } } },
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
    <Card>
      <CardHeader>
        <CardTitle>Editar plantilla</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateForm
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
              valueType: item.valueType,
              selectOptions: parseSelectOptions(item.selectOptions),
              order: item.order,
            })),
          }}
        />
      </CardContent>
    </Card>
  );
}
