import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { LabTestForm } from "@/components/forms/LabTestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatCurrency } from "@/lib/format";

export default async function TestsPage() {
  const tests = await prisma.labTest.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const totalPrice = tests.reduce(
    (acc, test) => acc + Number(test.price),
    0,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Catálogo de análisis</CardTitle>
            <span className="text-sm text-slate-500">
              Total: {formatCurrency(totalPrice)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>{test.code}</TableCell>
                  <TableCell>
                    <Link
                      className="text-slate-900 hover:underline"
                      href={`/catalog/tests/${test.id}`}
                    >
                      {test.name}
                    </Link>
                  </TableCell>
                  <TableCell>{test.section}</TableCell>
                  <TableCell>{formatCurrency(Number(test.price))}</TableCell>
                  <TableCell className="text-right">
                    <DeleteButton url={`/api/tests/${test.id}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <LabTestForm />
        </CardContent>
      </Card>
    </div>
  );
}
