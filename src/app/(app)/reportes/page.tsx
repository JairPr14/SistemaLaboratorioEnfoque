import Link from "next/link";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReportesFilterForm } from "./ReportesFilterForm";

type SearchParams = { dateFrom?: string; dateTo?: string };

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateRange(params: SearchParams) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let dateFrom: Date;
  let dateTo: Date;

  const fromParam = params.dateFrom?.trim();
  const toParam = params.dateTo?.trim();

  if (fromParam && toParam) {
    dateFrom = new Date(fromParam);
    dateTo = new Date(toParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
    if (dateFrom.getTime() > dateTo.getTime()) [dateFrom, dateTo] = [dateTo, dateFrom];
  } else {
    // Por defecto: último mes
    dateTo = new Date(today);
    dateFrom = new Date(today);
    dateFrom.setDate(dateFrom.getDate() - 30);
    dateFrom.setHours(0, 0, 0, 0);
  }

  return { dateFrom, dateTo };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { dateFrom, dateTo } = parseDateRange(params);

  const [orderItems, ordersSummary, revenueResult] = await Promise.all([
    prisma.labOrderItem.findMany({
      where: {
        order: {
          createdAt: { gte: dateFrom, lte: dateTo },
          status: { not: "ANULADO" },
        },
      },
      include: { labTest: true },
    }),
    prisma.labOrder.groupBy({
      by: ["status"],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: { id: true },
    }),
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        status: { not: "ANULADO" },
      },
    }),
  ]);

  // Agrupar por análisis (labTest)
  const byTest = new Map<
    string,
    { code: string; name: string; section: string; count: number }
  >();
  for (const item of orderItems) {
    const test = item.labTest;
    const key = test.id;
    const existing = byTest.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byTest.set(key, {
        code: test.code,
        name: test.name,
        section: test.section,
        count: 1,
      });
    }
  }

  const sortedAnalisis = [...byTest.values()].sort((a, b) => b.count - a.count);
  const totalSolicitudes = orderItems.length;
  const totalOrdenes = revenueResult._count.id ?? 0;
  const ingresos = Number(revenueResult._sum.totalPrice ?? 0);

  const statusLabels: Record<string, string> = {
    PENDIENTE: "Pendientes",
    EN_PROCESO: "En proceso",
    COMPLETADO: "Completados",
    ENTREGADO: "Entregados",
    ANULADO: "Anulados",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
          <p className="text-slate-500 mt-1">
            Análisis más solicitados y resumen por período
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-48 rounded-md bg-slate-100" />}>
          <ReportesFilterForm
            defaultDateFrom={params.dateFrom ?? toYYYYMMDD(dateFrom)}
            defaultDateTo={params.dateTo ?? toYYYYMMDD(dateTo)}
          />
        </Suspense>
      </div>

      {/* Resumen del período */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              {formatDate(dateFrom)} — {formatDate(dateTo)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Órdenes (no anuladas)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalOrdenes}</p>
            <p className="text-xs text-slate-500">Ingresos: {formatCurrency(ingresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Análisis solicitados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalSolicitudes}</p>
            <p className="text-xs text-slate-500">Total de pruebas en el período</p>
          </CardContent>
        </Card>
      </div>

      {/* Órdenes por estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Órdenes por estado (período)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ordersSummary.length === 0 ? (
              <p className="text-sm text-slate-500">Sin órdenes en el período</p>
            ) : (
              ordersSummary.map((s) => (
                <Badge key={s.status} variant="secondary" className="text-sm">
                  {statusLabels[s.status] ?? s.status}: {s._count.id}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Análisis más solicitados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis más solicitados</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Ordenados por cantidad. Filtrado por fechas seleccionadas.
          </p>
        </CardHeader>
        <CardContent>
          {sortedAnalisis.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p>No hay solicitudes en el período.</p>
              <p className="text-sm mt-1">
                Ajusta el rango de fechas o{" "}
                <Link href="/orders" className="text-slate-900 underline">
                  revisa las órdenes
                </Link>
                .
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Análisis</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead className="text-right w-24">Cantidad</TableHead>
                  <TableHead className="text-right w-24">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAnalisis.map((row, idx) => {
                  const pct =
                    totalSolicitudes > 0
                      ? ((row.count / totalSolicitudes) * 100).toFixed(1)
                      : "0";
                  return (
                    <TableRow key={row.code}>
                      <TableCell className="text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {row.section}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                      <TableCell className="text-right text-slate-600">{pct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
