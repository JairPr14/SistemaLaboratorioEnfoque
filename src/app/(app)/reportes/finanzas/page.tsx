import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";


import { getServerSession, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";
import { ReportesFilterForm } from "../ReportesFilterForm";
import {
  buildOrderWhere,
  toYYYYMMDD,
  type SearchParams,
} from "@/lib/reportes-utils";
import { CalendarDays, DollarSign, FileText, UserPlus, FlaskConical } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportesFinanzasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession();
  if (!hasPermission(session, PERMISSION_REPORTES)) redirect("/dashboard");

  const params = await searchParams;
  const { orderWhere, dateFrom, dateTo, useDeliveredDate } = await buildOrderWhere(params);

  const [
    orderItems,
    revenueResult,
    ordersList,
    admissionSummary,
    referredLabPayments,
    admissionPendingSettlement,
  ] = await Promise.all([
    prisma.labOrderItem.findMany({
      where: { order: orderWhere },
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
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: orderWhere,
    }),
    prisma.labOrder.findMany({
      where: orderWhere,
      select: { id: true },
    }),
    prisma.labOrder.groupBy({
      by: ["orderSource"],
      where: {
        orderSource: "ADMISION",
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.referredLabPayment.findMany({
      where: { order: orderWhere },
      include: { referredLab: { select: { id: true, name: true } } },
    }),
    prisma.labOrder.aggregate({
      where: {
        orderSource: "ADMISION",
        admissionSettledAt: null,
        status: { not: "ANULADO" },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
  ]);

  const referredOrderIds = new Set(
    orderItems
      .filter((i) => i.labTest.isReferred && i.labTest.externalLabCost)
      .map((i) => i.order.id)
  );
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
  const referredLabSummaries = [...costByReferredLab.entries()].map(
    ([labId, { labName, cost }]) => ({
      labId,
      labName,
      cost,
      paid: paidByLab.get(labId) ?? 0,
      balance: Math.max(0, cost - (paidByLab.get(labId) ?? 0)),
    })
  );
  const totalBalanceOwedToLabs = Math.max(0, totalExternalLabCost - paidToLabsInPeriod);

  const orderIds = ordersList.map((o) => o.id);
  const paidMap = await getPaidTotalsByOrderIds(prisma, orderIds);
  const cobrado = [...paidMap.values()].reduce((acc, v) => acc + v, 0);

  const totalOrdenes = revenueResult._count.id ?? 0;
  const ingresos = Number(revenueResult._sum.totalPrice ?? 0);
  const gananciaNetaReferidos = ingresos - totalExternalLabCost;

  const exportUrl = `/api/reportes/export?dateFrom=${encodeURIComponent(params.dateFrom ?? toYYYYMMDD(dateFrom))}&dateTo=${encodeURIComponent(params.dateTo ?? toYYYYMMDD(dateTo))}&status=${encodeURIComponent(params.status ?? "")}&paymentStatus=${encodeURIComponent(params.paymentStatus ?? "")}&branchId=${encodeURIComponent(params.branchId ?? "")}`;

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Reportes financieros"
        description="Facturación, cobros, admisión y terciarización"
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
              basePath="/reportes/finanzas"
            />
          </Suspense>
        </CardContent>
      </Card>

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

        <Card className="overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Facturado</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(ingresos)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Cobrado:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cobrado)}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(admissionPendingSettlement._count.id ?? 0) > 0 && (
          <Link href="/cobro-admision">
            <Card className="overflow-hidden border-violet-200 transition-colors hover:border-violet-400 dark:border-violet-800 dark:hover:border-violet-600">
              <div className="h-1 bg-violet-500" />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                    <UserPlus className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Pend. cobro admisión
                    </p>
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                      {formatCurrency(Number(admissionPendingSettlement._sum.totalPrice ?? 0))}
                    </p>
                    <p className="text-xs text-slate-500">
                      {admissionPendingSettlement._count.id} órdenes →
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {totalExternalLabCost > 0 && (
          <Card className="overflow-hidden">
            <div className="h-1 bg-amber-500" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <FlaskConical className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Lab. referidos
                  </p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalExternalLabCost)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Pagado: {formatCurrency(paidToLabsInPeriod)} • Pend.:{" "}
                    {formatCurrency(totalBalanceOwedToLabs)}
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Órdenes de Admisión</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Órdenes creadas desde admisión (cobro directo al público) en el período.
          </p>
        </CardHeader>
        <CardContent>
          {admissionSummary.length === 0 ? (
            <p className="text-sm text-slate-500">Sin órdenes de admisión en el período</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1">
              {admissionSummary.map((row) => {
                const total = Number(row._sum.totalPrice ?? 0);
                return (
                  <div
                    key={row.orderSource}
                    className="rounded-xl border border-slate-200 bg-emerald-50 p-4 dark:border-slate-700 dark:bg-emerald-900/20"
                  >
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Órdenes de admisión
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {row._count.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(total)} facturado (precio público)
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {referredLabSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Laboratorios referidos (terciarizados)</CardTitle>
            </div>
            <p className="mt-1 text-sm text-slate-500">
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
                    <TableRow
                      key={row.labId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{row.labName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.cost)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            row.balance > 0
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : "text-slate-500"
                          }
                        >
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
    </div>
  );
}
