import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: { id: string } };

export default async function TestDetailPage({ params }: Props) {
  const test = await prisma.labTest.findFirst({
    where: { id: params.id, deletedAt: null },
  });

  if (!test) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar análisis</CardTitle>
      </CardHeader>
      <CardContent>
        <LabTestForm
          testId={test.id}
          defaultValues={{
            code: test.code,
            name: test.name,
            section: test.section,
            price: Number(test.price),
            estimatedTimeMinutes: test.estimatedTimeMinutes ?? undefined,
            isActive: test.isActive,
          }}
        />
      </CardContent>
    </Card>
  );
}
