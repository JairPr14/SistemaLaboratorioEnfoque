import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";


import { getServerSession, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatPatientDisplayName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";
import { ReportesFilterForm } from "../ReportesFilterForm";
import {
  buildOrderWhere,
  toYYYYMMDD,
  type SearchParams,
} from "@/lib/reportes-utils";
import {
  Building2,
  TrendingUp,
  FileText,
  CalendarDays,
  Activity,
  BarChart3,
  FlaskConical,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendientes",
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completados",
  ENTREGADO: "Entregados",
  ANULADO: "Anulados",
};

const PATIENT_TYPE_LABELS: Record<string, string> = {
  CLINICA: "Paciente Clínica",
  EXTERNO: "Paciente Externo",
  IZAGA: "Paciente Izaga",
};

function getPatientTypeLabel(type: string | null): string {
  return type ? (PATIENT_TYPE_LABELS[type] ?? type) : "Sin especificar";
}

export default async function ReportesEstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession();
  if (!hasPermission(session, PERMISSION_REPORTES)) redirect("/dashboard");

  const params = await searchParams;
  const { orderWhere, dateFrom, dateTo, useDeliveredDate } = await buildOrderWhere(params);

  const [orderItems, ordersSummary, revenueResult, byPatientType, byBranch, ordersList, branches] =
    await Promise.all([
      prisma.labOrderItem.findMany({
        where: { order: orderWhere },
        include: {
          labTest: {
            include: {
              section: true,
            },
          },
          order: { select: { id: true } },
        },
      }),
      prisma.labOrder.groupBy({
        by: ["status"],
        where: orderWhere,
        _count: { id: true },
      }),
      prisma.labOrder.aggregate({
        _sum: { totalPrice: true },
        _count: { id: true },
        where: orderWhere,
      }),
      prisma.labOrder.groupBy({
        by: ["patientType"],
        where: orderWhere,
        _count: { id: true },
        _sum: { totalPrice: true },
      }),
      prisma.labOrder.groupBy({
        by: ["branchId"],
        where: orderWhere,
        _count: { id: true },
        _sum: { totalPrice: true },
      }),
      prisma.labOrder.findMany({
        where: orderWhere,
        include: { patient: true, branch: true },
        orderBy: useDeliveredDate
          ? [{ deliveredAt: "desc" }, { updatedAt: "desc" }]
          : { createdAt: "desc" },
        take: 500,
      }),
      prisma.branch.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
    ]);

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const byTest = new Map<
    string,
    { code: string; name: string; section: string; count: number; isReferred: boolean }
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
        section: test.section?.name ?? test.section?.code ?? "",
        count: 1,
        isReferred: test.isReferred ?? false,
      });
    }
  }

  const sortedAnalisis = [...byTest.values()].sort((a, b) => b.count - a.count);
  const totalSolicitudes = orderItems.length;
  const totalOrdenes = revenueResult._count.id ?? 0;

  const exportUrl = `/api/reportes/export?dateFrom=${encodeURIComponent(params.dateFrom ?? toYYYYMMDD(dateFrom))}&dateTo=${encodeURIComponent(params.dateTo ?? toYYYYMMDD(dateTo))}&status=${encodeURIComponent(params.status ?? "")}&paymentStatus=${encodeURIComponent(params.paymentStatus ?? "")}&branchId=${encodeURIComponent(params.branchId ?? "")}`;

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Reportes estadísticos"
        description="Órdenes, análisis solicitados, por sede y tipo de paciente"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros de búsqueda</CardTitle>
            <Link
              href={exportUrl}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              Exportar CSV
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
            }
          >
            <ReportesFilterForm
              key={`${params.dateFrom ?? ""}-${params.dateTo ?? ""}-${params.status ?? ""}-${params.paymentStatus ?? ""}-${params.branchId ?? ""}`}
              defaultDateFrom={params.dateFrom ?? toYYYYMMDD(dateFrom)}
              defaultDateTo={params.dateTo ?? toYYYYMMDD(dateTo)}
              defaultStatus={params.status ?? ""}
              defaultPaymentStatus={params.paymentStatus ?? ""}
              defaultBranchId={params.branchId ?? ""}
              basePath="/reportes/estadisticas"
            />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="h-1 bg-slate-400" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <CalendarDays className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Período</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(dateFrom)} – {formatDate(dateTo)}
                </p>
                {useDeliveredDate && (
                  <p className="text-xs text-slate-500">(por fecha de entrega)</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <MetricCard
          title="Total Órdenes"
          value={totalOrdenes}
          subtitle="órdenes en el período"
          icon={<FileText className="h-6 w-6" />}
          accent="blue"
        />

        <MetricCard
          title="Análisis Solicitados"
          value={totalSolicitudes}
          subtitle="pruebas en el período"
          icon={<TrendingUp className="h-6 w-6" />}
          accent="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Órdenes por estado</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Distribución de órdenes según su estado actual
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersSummary.length === 0 ? (
            <p className="py-8 text-center text-slate-500">Sin órdenes en el período seleccionado</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ordersSummary.map((s) => {
                const statusConfig: Record<
                  string,
                  { bg: string; border: string; text: string }
                > = {
                  PENDIENTE: {
                    bg: "bg-amber-50 dark:bg-amber-900/20",
                    border: "border-amber-200 dark:border-amber-800",
                    text: "text-amber-700 dark:text-amber-400",
                  },
                  EN_PROCESO: {
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    border: "border-blue-200 dark:border-blue-800",
                    text: "text-blue-700 dark:text-blue-400",
                  },
                  COMPLETADO: {
                    bg: "bg-emerald-50 dark:bg-emerald-900/20",
                    border: "border-emerald-200 dark:border-emerald-800",
                    text: "text-emerald-700 dark:text-emerald-400",
                  },
                  ENTREGADO: {
                    bg: "bg-green-50 dark:bg-green-900/20",
                    border: "border-green-200 dark:border-green-800",
                    text: "text-green-700 dark:text-green-400",
                  },
                  ANULADO: {
                    bg: "bg-red-50 dark:bg-red-900/20",
                    border: "border-red-200 dark:border-red-800",
                    text: "text-red-700 dark:text-red-400",
                  },
                };
                const config =
                  statusConfig[s.status] ?? {
                    bg: "bg-slate-50",
                    border: "border-slate-200",
                    text: "text-slate-700",
                  };
                return (
                  <div
                    key={s.status}
                    className={`rounded-xl border-2 p-4 ${config.bg} ${config.border}`}
                  >
                    <p className={`text-sm font-medium ${config.text}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </p>
                    <p className={`mt-2 text-3xl font-bold ${config.text}`}>{s._count.id}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {byPatientType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Por tipo de paciente</CardTitle>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Distribución de órdenes según tipo de paciente (clínica, externo, convenio).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {byPatientType.map((row) => {
                const label = getPatientTypeLabel(row.patientType);
                const sum = Number(row._sum.totalPrice ?? 0);
                const pct =
                  totalOrdenes > 0 ? ((row._count.id / totalOrdenes) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={row.patientType ?? "_null"}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {row._count.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(sum)} • {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Por sede</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Desglose de órdenes e ingresos por sede/sucursal.
          </p>
        </CardHeader>
        <CardContent>
          {byBranch.length === 0 ? (
            <p className="text-sm text-slate-500">Sin órdenes en el período</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Sede</TableHead>
                    <TableHead className="w-28 text-right font-semibold">Órdenes</TableHead>
                    <TableHead className="w-32 text-right font-semibold">% Total</TableHead>
                    <TableHead className="w-36 text-right font-semibold">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byBranch.map((row) => {
                    const branch = row.branchId ? branchMap.get(row.branchId) : null;
                    const label = branch ? branch.name : "Sin sede asignada";
                    const sum = Number(row._sum.totalPrice ?? 0);
                    const pct =
                      totalOrdenes > 0
                        ? ((row._count.id / totalOrdenes) * 100).toFixed(1)
                        : "0";
                    return (
                      <TableRow key={row.branchId ?? "_sin_sede"}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{row._count.id}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(sum)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Órdenes del período</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {useDeliveredDate
              ? "Órdenes entregadas en el rango de fechas (por fecha de entrega). Máximo 500."
              : "Listado con sede asignada. Máximo 500 órdenes."}
          </p>
        </CardHeader>
        <CardContent>
          {ordersList.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay órdenes en el período.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">
                      {useDeliveredDate ? "Fecha entrega" : "Fecha"}
                    </TableHead>
                    <TableHead className="font-semibold">Paciente</TableHead>
                    <TableHead className="font-semibold">Sede</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersList.map((order, idx) => {
                    const branchName = order.branch?.name ?? "Sin sede";
                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDate(
                            useDeliveredDate && order.deliveredAt
                              ? order.deliveredAt
                              : order.createdAt
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatPatientDisplayName(order.patient.firstName, order.patient.lastName)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            <Building2 className="h-3 w-3" />
                            {branchName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="order"
                            value={order.status}
                            label={STATUS_LABELS[order.status] ?? order.status}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(order.totalPrice))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Análisis más solicitados</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {useDeliveredDate
              ? "Análisis de órdenes entregadas en el período (por fecha de entrega)."
              : "Ordenados por cantidad. Filtrado por fechas seleccionadas."}
          </p>
        </CardHeader>
        <CardContent>
          {sortedAnalisis.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">
                No hay solicitudes en el período.
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Ajusta el rango de fechas o{" "}
                <Link
                  href="/orders"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  revisa las órdenes
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="w-12 font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Análisis</TableHead>
                    <TableHead className="font-semibold">Sección</TableHead>
                    <TableHead className="w-24 text-right font-semibold">Cantidad</TableHead>
                    <TableHead className="w-32 text-right font-semibold">Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAnalisis.map((row, idx) => {
                    const pct =
                      totalSolicitudes > 0
                        ? ((row.count / totalSolicitudes) * 100).toFixed(1)
                        : "0";
                    const pctNum = parseFloat(pct);
                    return (
                      <TableRow
                        key={row.code}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <TableCell>
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                              idx < 3
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {row.code}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {row.section}
                            </span>
                            {row.isReferred && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <FlaskConical className="h-3 w-3" />
                                Referido
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {row.count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-blue-500 dark:bg-blue-400"
                                style={{ width: `${Math.min(pctNum, 100)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-sm text-slate-600 dark:text-slate-400">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
