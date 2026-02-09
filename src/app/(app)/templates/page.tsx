import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/components/forms/TemplateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/common/DeleteButton";

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

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Análisis</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Items</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    {template.labTest.code} - {template.labTest.name}
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-slate-900 hover:underline"
                      href={`/templates/${template.id}`}
                    >
                      {template.title}
                    </Link>
                  </TableCell>
                  <TableCell>{template.items.length}</TableCell>
                  <TableCell className="text-right">
                    <DeleteButton url={`/api/templates/${template.id}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nueva plantilla</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            labTests={tests.map((test) => ({
              id: test.id,
              name: test.name,
              code: test.code,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
