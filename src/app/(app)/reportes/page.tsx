import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import type { OrderStatus, Prisma } from "@prisma/client";
import { authOptions, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate, formatPatientDisplayName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";
import { ReportesFilterForm } from "./ReportesFilterForm";
import { Building2, TrendingUp, FileText, DollarSign, CalendarDays, Activity, BarChart3, UserPlus, FlaskConical } from "lucide-react";

type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentStatus?: "PENDIENTE" | "PARCIAL" | "PAGADO" | string;
  branchId?: string;
};

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parsea "YYYY-MM-DD" en hora local para evitar desfase por zona horaria */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date(dateStr);
  }
  const date = new Date(y, m - 1, d);
  return date;
}

function parseDateRange(params: SearchParams) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let dateFrom: Date;
  let dateTo: Date;

  const fromParam = params.dateFrom?.trim();
  const toParam = params.dateTo?.trim();

  if (fromParam && toParam) {
    dateFrom = parseLocalDate(fromParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = parseLocalDate(toParam);
    dateTo.setHours(23, 59, 59, 999);
    if (dateFrom.getTime() > dateTo.getTime()) [dateFrom, dateTo] = [dateTo, dateFrom];
  } else if (fromParam) {
    dateFrom = parseLocalDate(fromParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(today);
  } else if (toParam) {
    dateTo = parseLocalDate(toParam);
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

export const dynamic = "force-dynamic";

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
  const paymentStatusFilter = params.paymentStatus?.trim() || undefined;
  const branchIdFilter = params.branchId?.trim() || undefined;

  // Para "Entregados" usamos fecha de entrega (deliveredAt); para el resto, fecha de creación (createdAt)
  const useDeliveredDate = statusFilter === "ENTREGADO";
  const orderWhereWithDate: Prisma.LabOrderWhereInput = useDeliveredDate
    ? {
        status: "ENTREGADO",
        deliveredAt: { not: null, gte: dateFrom, lte: dateTo },
        ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
      }
    : {
        ...(statusFilter ? { status: statusFilter as OrderStatus } : { status: { not: "ANULADO" } }),
        createdAt: { gte: dateFrom, lte: dateTo },
        ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
      };

  let orderWhereFinal: Prisma.LabOrderWhereInput = orderWhereWithDate;
  if (paymentStatusFilter) {
    const baseOrders = await prisma.labOrder.findMany({
      where: orderWhereWithDate,
      select: { id: true, totalPrice: true },
    });
    const baseIds = baseOrders.map((o) => o.id);
    const paidByOrder = await getPaidTotalsByOrderIds(prisma, baseIds);

    const filteredIds = baseOrders
      .filter((o) => {
        const paid = paidByOrder.get(o.id) ?? 0;
        const total = Number(o.totalPrice);
        const state = paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
        return state === paymentStatusFilter;
      })
      .map((o) => o.id);

    orderWhereFinal = {
      ...orderWhereWithDate,
      id: { in: filteredIds.length > 0 ? filteredIds : ["__none__"] },
    };
  }

  const [orderItems, ordersSummary, revenueResult, byPatientType, byBranch, ordersList, branches, admissionSummary, referredLabPayments, admissionPendingSettlement] = await Promise.all([
    prisma.labOrderItem.findMany({
      where: { order: orderWhereFinal },
      include: {
        labTest: {
          include: {
            section: true,
            referredLab: { select: { id: true, name: true } },
          },
        },
        order: { select: { id: true } },
      },
    }),
    prisma.labOrder.groupBy({
      by: ["status"],
      where: orderWhereFinal,
      _count: { id: true },
    }),
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: orderWhereFinal,
    }),
    prisma.labOrder.groupBy({
      by: ["patientType"],
      where: orderWhereFinal,
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.labOrder.groupBy({
      by: ["branchId"],
      where: orderWhereFinal,
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.labOrder.findMany({
      where: orderWhereFinal,
      include: { patient: true, branch: true },
      orderBy: useDeliveredDate
        ? [{ deliveredAt: "desc" }, { updatedAt: "desc" }]
        : { createdAt: "desc" },
      take: 500,
    }),
    prisma.branch.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.admissionRequest.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.referredLabPayment.findMany({
      where: {
        order: orderWhereFinal,
      },
      include: { referredLab: { select: { id: true, name: true } } },
    }),
    prisma.labOrder.aggregate({
      where: {
        admissionRequestId: { not: null },
        admissionSettledAt: null,
        status: { not: "ANULADO" },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
  ]);

  // Mapa de branches para lookup rápido
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  // Agrupar por análisis (labTest)
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

  // Datos de laboratorios referidos
  const referredOrderIds = new Set(orderItems.filter((i) => i.labTest.isReferred && i.labTest.externalLabCost).map((i) => i.order.id));
  let totalExternalLabCost = 0;
  const costByReferredLab = new Map<string, { labId: string; labName: string; cost: number }>();
  for (const item of orderItems) {
    const lt = item.labTest;
    if (!lt.isReferred || !lt.referredLabId || !lt.externalLabCost) continue;
    const cost = Number(lt.externalLabCost);
    totalExternalLabCost += cost;
    const lab = lt.referredLab;
    if (lab) {
      const existing = costByReferredLab.get(lab.id);
      if (existing) existing.cost += cost;
      else costByReferredLab.set(lab.id, { labId: lab.id, labName: lab.name, cost });
    }
  }
  const paidToLabsInPeriod = referredLabPayments
    .filter((p) => referredOrderIds.has(p.orderId))
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const paidByLab = new Map<string, number>();
  for (const p of referredLabPayments) {
    if (!referredOrderIds.has(p.orderId)) continue;
    const cur = paidByLab.get(p.referredLabId) ?? 0;
    paidByLab.set(p.referredLabId, cur + Number(p.amount));
  }
  const referredLabSummaries = [...costByReferredLab.entries()].map(([labId, { labName, cost }]) => ({
    labId,
    labName,
    cost,
    paid: paidByLab.get(labId) ?? 0,
    balance: Math.max(0, cost - (paidByLab.get(labId) ?? 0)),
  }));
  const totalBalanceOwedToLabs = Math.max(0, totalExternalLabCost - paidToLabsInPeriod);

  const sortedAnalisis = [...byTest.values()].sort((a, b) => b.count - a.count);
  const totalSolicitudes = orderItems.length;
  const totalOrdenes = revenueResult._count.id ?? 0;
  const ingresos = Number(revenueResult._sum.totalPrice ?? 0);
  const gananciaNetaReferidos = ingresos - totalExternalLabCost;
  const orderIds = ordersList.map((o) => o.id);
  const paidMap = await getPaidTotalsByOrderIds(prisma, orderIds);
  const cobrado = [...paidMap.values()].reduce((acc, v) => acc + v, 0);

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
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Reportes"
        description="Análisis más solicitados y resumen por período"
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros de búsqueda</CardTitle>
            <Link
              href={`/api/reportes/export?dateFrom=${encodeURIComponent(params.dateFrom ?? toYYYYMMDD(dateFrom))}&dateTo=${encodeURIComponent(params.dateTo ?? toYYYYMMDD(dateTo))}&status=${encodeURIComponent(params.status ?? "")}&paymentStatus=${encodeURIComponent(params.paymentStatus ?? "")}&branchId=${encodeURIComponent(params.branchId ?? "")}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              Exportar CSV
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />}>
            <ReportesFilterForm
              key={`${params.dateFrom ?? ""}-${params.dateTo ?? ""}-${params.status ?? ""}-${params.paymentStatus ?? ""}-${params.branchId ?? ""}`}
              defaultDateFrom={params.dateFrom ?? toYYYYMMDD(dateFrom)}
              defaultDateTo={params.dateTo ?? toYYYYMMDD(dateTo)}
              defaultStatus={statusFilter ?? ""}
              defaultPaymentStatus={paymentStatusFilter ?? ""}
              defaultBranchId={branchIdFilter ?? ""}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Resumen del período */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
                  {formatDate(dateFrom)}
                </p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(dateTo)}
                </p>
                {statusFilter === "ENTREGADO" && (
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
        
        <Card className="overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Facturado</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(ingresos)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Cobrado: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(cobrado)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <MetricCard
          title="Análisis Solicitados"
          value={totalSolicitudes}
          subtitle="pruebas en el período"
          icon={<TrendingUp className="h-6 w-6" />}
          accent="violet"
        />
        {totalExternalLabCost > 0 && (
          <Card className="overflow-hidden">
            <div className="h-1 bg-amber-500" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <FlaskConical className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lab. referidos</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalExternalLabCost)}</p>
                  <p className="text-xs text-slate-500">
                    Pagado: {formatCurrency(paidToLabsInPeriod)} • Pendiente: {formatCurrency(totalBalanceOwedToLabs)}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Ganancia neta: {formatCurrency(gananciaNetaReferidos)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pendiente de cobro a admisión */}
      {(admissionPendingSettlement._count.id ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base">Pendiente de cobro a admisión</CardTitle>
              </div>
              <Link
                href="/cobro-admision"
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Ver cobro admisión →
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {admissionPendingSettlement._count.id} órdenes de admisión por saldar. Total:{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(Number(admissionPendingSettlement._sum.totalPrice ?? 0))}
              </span>
            </p>
          </CardHeader>
        </Card>
      )}

      {/* Pre-órdenes de Admisión */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Pre-órdenes de Admisión</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Resumen de pre-órdenes creadas en el período.
          </p>
        </CardHeader>
        <CardContent>
          {admissionSummary.length === 0 ? (
            <p className="text-sm text-slate-500">Sin pre-órdenes en el período</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {admissionSummary.map((row) => {
                const admLabels: Record<string, string> = {
                  PENDIENTE: "Pendientes",
                  CONVERTIDA: "Convertidas",
                  CANCELADA: "Canceladas",
                };
                const admConfig: Record<string, { bg: string; text: string }> = {
                  PENDIENTE: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400" },
                  CONVERTIDA: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
                  CANCELADA: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
                };
                const cfg = admConfig[row.status] ?? { bg: "bg-slate-50", text: "text-slate-700" };
                const total = Number(row._sum.totalPrice ?? 0);
                return (
                  <div key={row.status} className={`rounded-xl border border-slate-200 p-4 dark:border-slate-700 ${cfg.bg}`}>
                    <p className={`text-sm font-medium ${cfg.text}`}>{admLabels[row.status] ?? row.status}</p>
                    <p className={`mt-2 text-2xl font-bold ${cfg.text}`}>{row._count.id}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatCurrency(total)} facturado</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Laboratorios referidos / Análisis terciarizados */}
      {referredLabSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Laboratorios referidos (terciarizados)</CardTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Costo y pagos a laboratorios externos por análisis referidos en el período.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Laboratorio</TableHead>
                    <TableHead className="text-right font-semibold">Costo externo</TableHead>
                    <TableHead className="text-right font-semibold">Pagado</TableHead>
                    <TableHead className="text-right font-semibold">Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredLabSummaries.map((row) => (
                    <TableRow key={row.labId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{row.labName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(row.cost)}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(row.paid)}</TableCell>
                      <TableCell className="text-right">
                        <span className={row.balance > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-500"}>
                          {formatCurrency(row.balance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Órdenes por estado */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Órdenes por estado</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">Distribución de órdenes según su estado actual</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersSummary.length === 0 ? (
            <p className="py-8 text-center text-slate-500">Sin órdenes en el período seleccionado</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ordersSummary.map((s) => {
                const statusConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                  PENDIENTE: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", icon: "bg-amber-100 dark:bg-amber-900/40" },
                  EN_PROCESO: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", icon: "bg-blue-100 dark:bg-blue-900/40" },
                  COMPLETADO: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", icon: "bg-emerald-100 dark:bg-emerald-900/40" },
                  ENTREGADO: { bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-400", icon: "bg-green-100 dark:bg-green-900/40" },
                  ANULADO: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "bg-red-100 dark:bg-red-900/40" },
                };
                const config = statusConfig[s.status] ?? { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: "bg-slate-100" };
                return (
                  <div
                    key={s.status}
                    className={`rounded-xl border-2 p-4 ${config.bg} ${config.border}`}
                  >
                    <p className={`text-sm font-medium ${config.text}`}>{statusLabels[s.status] ?? s.status}</p>
                    <p className={`mt-2 text-3xl font-bold ${config.text}`}>{s._count.id}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reportes por Sede - Nueva sección mejorada */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Reportes por Sede</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Desglose de órdenes e ingresos por sede/sucursal.
          </p>
        </CardHeader>
        <CardContent>
          {byBranch.length === 0 ? (
            <p className="text-sm text-slate-500">Sin órdenes en el período</p>
          ) : (
            <div className="space-y-4">
              {/* Cards visuales por sede */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byBranch.map((row) => {
                  const branch = row.branchId ? branchMap.get(row.branchId) : null;
                  const label = branch ? branch.name : "Sin sede asignada";
                  const code = branch?.code ?? "";
                  const sum = Number(row._sum.totalPrice ?? 0);
                  const count = row._count.id;
                  const branchColors: Record<string, string> = {
                    CLINICA: "from-blue-500 to-blue-600",
                    EXTERNO: "from-amber-500 to-amber-600",
                    IZAGA: "from-emerald-500 to-emerald-600",
                  };
                  const gradientClass = branchColors[code] ?? "from-slate-500 to-slate-600";
                  
                  return (
                    <div
                      key={row.branchId ?? "_sin_sede"}
                      className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className={`bg-gradient-to-r ${gradientClass} px-4 py-3`}>
                        <p className="text-sm font-semibold text-white">{label}</p>
                        {code && <p className="text-xs text-white/70">{code}</p>}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                        <div className="px-4 py-3 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Órdenes</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sum)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Tabla detallada */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="font-semibold">Sede</TableHead>
                      <TableHead className="text-right w-28 font-semibold">Órdenes</TableHead>
                      <TableHead className="text-right w-32 font-semibold">% Total</TableHead>
                      <TableHead className="text-right w-36 font-semibold">Ingresos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byBranch.map((row) => {
                      const branch = row.branchId ? branchMap.get(row.branchId) : null;
                      const label = branch ? branch.name : "Sin sede asignada";
                      const sum = Number(row._sum.totalPrice ?? 0);
                      const pct = totalOrdenes > 0 ? ((row._count.id / totalOrdenes) * 100).toFixed(1) : "0";
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
                            <Badge variant="secondary" className="text-xs">{pct}%</Badge>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Órdenes del período (con sede) - Diseño mejorado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Órdenes del período</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === "ENTREGADO"
              ? "Órdenes entregadas en el rango de fechas (por fecha de entrega). Máximo 500."
              : "Listado con sede asignada. Máximo 500 órdenes."}
          </p>
        </CardHeader>
        <CardContent>
          {ordersList.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay órdenes en el período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">{statusFilter === "ENTREGADO" ? "Fecha entrega" : "Fecha"}</TableHead>
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
                      <TableRow key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDate(
                            statusFilter === "ENTREGADO" && order.deliveredAt
                              ? order.deliveredAt
                              : order.createdAt,
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
                          <StatusBadge type="order" value={order.status} label={statusLabels[order.status] ?? order.status} />
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

      {/* Análisis más solicitados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Análisis más solicitados</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === "ENTREGADO"
              ? "Análisis de órdenes entregadas en el período (por fecha de entrega)."
              : "Ordenados por cantidad. Filtrado por fechas seleccionadas."}
          </p>
        </CardHeader>
        <CardContent>
          {sortedAnalisis.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No hay solicitudes en el período.</p>
              <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">
                Ajusta el rango de fechas o{" "}
                <Link href="/orders" className="text-blue-600 hover:underline dark:text-blue-400">
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
                    <TableHead className="text-right w-24 font-semibold">Cantidad</TableHead>
                    <TableHead className="text-right w-32 font-semibold">Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAnalisis.map((row, idx) => {
                    const pct = totalSolicitudes > 0
                      ? ((row.count / totalSolicitudes) * 100).toFixed(1)
                      : "0";
                    const pctNum = parseFloat(pct);
                    return (
                      <TableRow key={row.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell>
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            idx < 3
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-300">
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
                          <span className="font-bold text-slate-900 dark:text-slate-100">{row.count}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-blue-500 dark:bg-blue-400"
                                style={{ width: `${Math.min(pctNum, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">{pct}%</span>
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
