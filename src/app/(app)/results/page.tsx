import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { ResultActions } from "@/components/orders/ResultActions";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();

  const results = await prisma.labResult.findMany({
    where: search
      ? {
          OR: [
            { orderItem: { order: { orderCode: { contains: search } } } },
            {
              orderItem: {
                order: {
                  patient: {
                    OR: [
                      { firstName: { contains: search } },
                      { lastName: { contains: search } },
                      { dni: { contains: search } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      orderItem: {
        include: {
          order: { include: { patient: true } },
          labTest: true,
        },
      },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>Resultados registrados</CardTitle>
        <form className="flex items-center gap-2" method="GET">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar por paciente u orden..."
            className="h-9 rounded-md border border-slate-200 px-3 text-sm"
          />
          <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            Buscar
          </button>
        </form>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <p>No se encontraron resultados registrados.</p>
            <p className="text-sm mt-2">
              Ve a <Link href="/orders" className="text-slate-900 hover:underline">Órdenes</Link> para capturar resultados.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Análisis</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Reportado</TableHead>
                <TableHead>Parámetros</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${result.orderItem.orderId}`}
                      className="text-slate-900 hover:underline font-medium"
                    >
                      {result.orderItem.order.orderCode}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.orderItem.order.patient.firstName}{" "}
                    {result.orderItem.order.patient.lastName}
                  </TableCell>
                  <TableCell>{result.orderItem.order.patient.dni}</TableCell>
                  <TableCell>
                    {result.orderItem.labTest.code} - {result.orderItem.labTest.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {result.orderItem.labTest.section}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(result.reportedAt)}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="bg-emerald-100 text-emerald-700">
                      {result.items.length} parámetros
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ResultActions
                      orderId={result.orderItem.orderId}
                      orderCode={result.orderItem.order.orderCode}
                      patientName={`${result.orderItem.order.patient.firstName} ${result.orderItem.order.patient.lastName}`}
                      patientPhone={result.orderItem.order.patient.phone}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
