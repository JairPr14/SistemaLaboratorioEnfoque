import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReportesFilterForm } from "./ReportesFilterForm";

type SearchParams = { dateFrom?: string; dateTo?: string; status?: string };

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
  } else if (fromParam) {
    dateFrom = new Date(fromParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(today);
  } else if (toParam) {
    dateTo = new Date(toParam);
    dateTo.setHours(23, 59, 59, 999);
    dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - 30);
    dateFrom.setHours(0, 0, 0, 0);
  } else {
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
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, PERMISSION_REPORTES)) redirect("/dashboard");

  const params = await searchParams;
  const { dateFrom, dateTo } = parseDateRange(params);
  const statusFilter = params.status?.trim() || undefined;

  // Para "Entregados" usamos fecha de entrega (deliveredAt); para el resto, fecha de creación (createdAt)
  const useDeliveredDate = statusFilter === "ENTREGADO";
  const orderWhereWithDate = useDeliveredDate
    ? {
        status: "ENTREGADO" as const,
        deliveredAt: { not: null, gte: dateFrom, lte: dateTo },
      }
    : {
        ...(statusFilter ? { status: statusFilter } : { status: { not: "ANULADO" } }),
        createdAt: { gte: dateFrom, lte: dateTo },
      };

  const [orderItems, ordersSummary, revenueResult, byPatientType, ordersList] = await Promise.all([
    prisma.labOrderItem.findMany({
      where: { order: orderWhereWithDate },
      include: { labTest: true },
    }),
    prisma.labOrder.groupBy({
      by: ["status"],
      where: orderWhereWithDate,
      _count: { id: true },
    }),
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: orderWhereWithDate,
    }),
    prisma.labOrder.groupBy({
      by: ["patientType"],
      where: orderWhereWithDate,
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.labOrder.findMany({
      where: orderWhereWithDate,
      include: { patient: true },
      orderBy: useDeliveredDate
        ? [{ deliveredAt: "desc" }, { updatedAt: "desc" }]
        : { createdAt: "desc" },
      take: 500,
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

  const sedeLabels: Record<string, string> = {
    CLINICA: "Paciente Clínica",
    EXTERNO: "Paciente Externo",
    IZAGA: "Paciente Izaga",
  };
  function getSedeLabel(type: string | null): string {
    return type ? (sedeLabels[type] ?? type) : "Sin especificar";
  }

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
            key={`${params.dateFrom ?? ""}-${params.dateTo ?? ""}-${params.status ?? ""}`}
            defaultDateFrom={params.dateFrom ?? toYYYYMMDD(dateFrom)}
            defaultDateTo={params.dateTo ?? toYYYYMMDD(dateTo)}
            defaultStatus={statusFilter ?? ""}
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
              {statusFilter === "ENTREGADO" && (
                <span className="ml-2 text-slate-500">(por fecha de entrega)</span>
              )}
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

      {/* Por sede / Tipo de paciente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por sede (tipo de paciente)</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Órdenes e ingresos según tipo: Clínica, Externo, Izaga.
          </p>
        </CardHeader>
        <CardContent>
          {byPatientType.length === 0 ? (
            <p className="text-sm text-slate-500">Sin órdenes en el período</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sede / Tipo</TableHead>
                    <TableHead className="text-right w-28">Órdenes</TableHead>
                    <TableHead className="text-right w-32">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byPatientType.map((row) => {
                    const label = getSedeLabel(row.patientType);
                    const sum = Number(row._sum.totalPrice ?? 0);
                    return (
                      <TableRow key={row.patientType ?? "_sin_especificar"}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-right">{row._count.id}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sum)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Órdenes del período (con sede) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Órdenes del período</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === "ENTREGADO"
              ? "Órdenes entregadas en el rango de fechas (por fecha de entrega). Máximo 500."
              : "Listado con sede asignada. Máximo 500 órdenes."}
          </p>
        </CardHeader>
        <CardContent>
          {ordersList.length === 0 ? (
            <p className="text-sm text-slate-500">No hay órdenes en el período.</p>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
<TableHeader>
                <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>{statusFilter === "ENTREGADO" ? "Fecha entrega" : "Fecha"}</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersList.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {order.orderCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(
                          statusFilter === "ENTREGADO" && order.deliveredAt
                            ? order.deliveredAt
                            : order.createdAt,
                        )}
                      </TableCell>
                      <TableCell>
                        {order.patient.lastName} {order.patient.firstName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getSedeLabel(order.patientType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {statusLabels[order.status] ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(order.totalPrice))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análisis más solicitados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis más solicitados</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === "ENTREGADO"
              ? "Análisis de órdenes entregadas en el período (por fecha de entrega)."
              : "Ordenados por cantidad. Filtrado por fechas seleccionadas."}
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
