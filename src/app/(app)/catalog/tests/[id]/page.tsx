import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function TestDetailPage({ params }: Props) {
  const { id } = await params;
  const test = await prisma.labTest.findFirst({
    where: { id, deletedAt: null },
  });

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
    </div>
  );
}
