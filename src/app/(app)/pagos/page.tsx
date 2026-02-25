import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";

import { redirect } from "next/navigation";
import { authOptions, hasPermission, PERMISSION_IMPRIMIR_TICKET_PAGO, PERMISSION_REGISTRAR_PAGOS, PERMISSION_VER_PAGOS, PERMISSION_VER_ADMISION } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate, formatPatientDisplayName } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { calculateConventionTotal } from "@/lib/order-pricing";
import { parseLocalDate } from "@/lib/date";
import { PAYMENT_ROW_HOVER_CLASS } from "@/lib/table-row-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RegistrarpagoButton } from "@/components/pagos/RegistrarpagoButton";
import { PagosTabs } from "@/components/pagos/PagosTabs";
import { EmptyTableRow } from "@/components/common/EmptyTableRow";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FilterDateRange } from "@/components/common/FilterDateRange";
import { FilterSubmitReset } from "@/components/common/FilterSubmitReset";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Search, Eye, Printer, Receipt, Building2, DollarSign, FileText, CreditCard, UserPlus, FlaskConical, Wallet } from "lucide-react";

type TabValue = "pendientes" | "parcial" | "cobrados";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    from?: string;
    to?: string;
    cajaDate?: string;
  }>;
}) {
  const params = await searchParams;
  const validTabs: TabValue[] = ["pendientes", "parcial", "cobrados"];
  const tabParam = params.tab?.toLowerCase();
  const tab = validTabs.includes(tabParam as TabValue) ? (tabParam as TabValue) : "pendientes";
  const search = params.search?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
   const cajaDateParam = params.cajaDate?.trim();
  const session = await getServerSession(authOptions);
  const canAccessPagos = hasPermission(session, PERMISSION_VER_PAGOS) || hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  if (!canAccessPagos) redirect("/dashboard");
  const canRegisterPayment = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  const canPrintTicket = hasPermission(session, PERMISSION_IMPRIMIR_TICKET_PAGO) || canAccessPagos;
  const canViewAdmision = hasPermission(session, PERMISSION_VER_ADMISION);

  const dateFrom = from ? parseLocalDate(from, false) : null;
  const dateTo = to ? parseLocalDate(to, true) : null;

  // Rango para caja (por día). Si no se selecciona fecha, usa hoy.
  let cajaStart: Date;
  let cajaEnd: Date;
  if (cajaDateParam) {
    cajaStart = parseLocalDate(cajaDateParam, false);
    cajaEnd = parseLocalDate(cajaDateParam, true);
  } else {
    cajaStart = new Date();
    cajaStart.setHours(0, 0, 0, 0);
    cajaEnd = new Date();
    cajaEnd.setHours(23, 59, 59, 999);
  }

  const [cajaIngresos, cajaEgresos, cajaIngresosByMethod] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { gte: cajaStart, lte: cajaEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.referredLabPayment.aggregate({
      where: { paidAt: { gte: cajaStart, lte: cajaEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { paidAt: { gte: cajaStart, lte: cajaEnd } },
      _sum: { amount: true },
    }),
  ]);

  const cajaIngresosHoy = Number(cajaIngresos._sum.amount ?? 0);
  const cajaEgresosHoy = Number(cajaEgresos._sum.amount ?? 0);
  const cajaTotalHoy = cajaIngresosHoy - cajaEgresosHoy;
  const orders = await prisma.labOrder.findMany({
    where: {
      status: { not: "ANULADO" },
      ...(dateFrom ?? dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderCode: { contains: search, mode: "insensitive" as const } },
              {
                patient: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" as const } },
                    { lastName: { contains: search, mode: "insensitive" as const } },
                    { dni: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          labTest: {
            select: {
              code: true,
              name: true,
              isReferred: true,
              externalLabCost: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderIds = orders.map((o) => o.id);
  const [paidByOrder, admissionPendingOrders, referredLabPayments] = await Promise.all([
    getPaidTotalsByOrderIds(prisma, orderIds),
    canViewAdmision
      ? prisma.labOrder.findMany({
          where: {
            admissionRequestId: { not: null },
            admissionSettledAt: null,
            status: { not: "ANULADO" },
            ...(dateFrom ?? dateTo
              ? {
                  createdAt: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                  },
                }
              : {}),
          },
          select: {
            id: true,
            items: {
              select: {
                priceConventionSnapshot: true,
                priceSnapshot: true,
              },
            },
          },
        })
      : [],
    prisma.referredLabPayment.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, amount: true },
    }),
  ]);

  const admissionPendingTotal = admissionPendingOrders.reduce((s, order) => s + calculateConventionTotal(order.items), 0);
  const admissionPendingCount = admissionPendingOrders.length;

  let totalExternalCost = 0;
  const paidToLabs = referredLabPayments.reduce((s, p) => s + Number(p.amount), 0);
  orders.forEach((o) => {
    o.items.forEach((i) => {
      if (i.labTest.isReferred && i.labTest.externalLabCost) totalExternalCost += Number(i.labTest.externalLabCost);
    });
  });
  const referredBalance = Math.max(0, totalExternalCost - paidToLabs);

  const conventionTotalForOrder = (order: (typeof orders)[0]) => {
    if (!order.admissionRequestId) return null;
    return calculateConventionTotal(order.items);
  };

  const ordersWithPayment = orders.map((order) => {
    const paid = paidByOrder.get(order.id) ?? 0;
    const conventionTotal = conventionTotalForOrder(order);
    const total = conventionTotal != null ? conventionTotal : Number(order.totalPrice);
    const paymentStatus =
      paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
    return {
      ...order,
      paidTotal: paid,
      balance: Math.max(0, total - paid),
      paymentStatus: paymentStatus as "PENDIENTE" | "PARCIAL" | "PAGADO",
    };
  });

  const paymentStatusFilter: Record<TabValue, "PENDIENTE" | "PARCIAL" | "PAGADO"> = {
    pendientes: "PENDIENTE",
    parcial: "PARCIAL",
    cobrados: "PAGADO",
  };
  const visibleOrders = ordersWithPayment.filter(
    (o) => o.paymentStatus === paymentStatusFilter[tab],
  );

  const counts = {
    pendientes: ordersWithPayment.filter((o) => o.paymentStatus === "PENDIENTE").length,
    parcial: ordersWithPayment.filter((o) => o.paymentStatus === "PARCIAL").length,
    cobrados: ordersWithPayment.filter((o) => o.paymentStatus === "PAGADO").length,
  };

  const totalPendiente = ordersWithPayment
    .filter((o) => o.paymentStatus === "PENDIENTE")
    .reduce((sum, o) => sum + o.balance, 0);
  const totalParcial = ordersWithPayment
    .filter((o) => o.paymentStatus === "PARCIAL")
    .reduce((sum, o) => sum + o.balance, 0);
  const totalCobrado = ordersWithPayment
    .filter((o) => o.paymentStatus === "PAGADO")
    .reduce((sum, o) => sum + o.paidTotal, 0);

  return (
    <div className="space-y-4">
      {/* Header con título y botón de registrar pago */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pagos / Cobros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de cobros y pagos de órdenes</p>
        </div>
        {canRegisterPayment && <RegistrarpagoButton />}
      </div>

      {/* Caja del día */}
      <Card className="border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
              <Wallet className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-lg">Caja del día</CardTitle>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {formatDate(cajaStart)} — Ingresos y egresos del día seleccionado
              </p>
            </div>
            </div>
            <form method="GET" className="flex items-center gap-2 text-xs">
              <label htmlFor="cajaDate" className="text-slate-600 dark:text-slate-300">
                Día de caja:
              </label>
              <input
                id="cajaDate"
                type="date"
                name="cajaDate"
                defaultValue={cajaStart.toISOString().slice(0, 10)}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md bg-slate-900 px-2 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                Ver
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Ingresos (cobros a pacientes)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(cajaIngresosHoy)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{cajaIngresos._count.id} movimiento(s)</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Egresos (pagos a lab. referidos)</p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(cajaEgresosHoy)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{cajaEgresos._count.id} pago(s)</p>
            </div>
            <div className="rounded-lg border-2 border-slate-400 bg-slate-100 p-4 dark:border-slate-500 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Total caja hoy</p>
              <p className={`mt-1 text-2xl font-bold ${cajaTotalHoy >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(cajaTotalHoy)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Ingresos − Egresos</p>
            </div>
          </div>
          {cajaIngresosByMethod.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ingresos por método de pago</p>
              <div className="flex flex-wrap gap-3">
                {cajaIngresosByMethod.map((row) => (
                  <span key={row.method} className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-medium shadow-sm dark:bg-slate-700">
                    <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                    {PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] ?? row.method}: {formatCurrency(Number(row._sum.amount ?? 0))}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de resumen */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          title={`Pendientes (${counts.pendientes})`}
          value={formatCurrency(totalPendiente)}
          subtitle="por cobrar"
          icon={<CreditCard className="h-5 w-5" />}
          accent="amber"
        />
        <MetricCard
          title={`Parcial (${counts.parcial})`}
          value={formatCurrency(totalParcial)}
          subtitle="saldo parcial"
          icon={<DollarSign className="h-5 w-5" />}
          accent="blue"
        />
        <MetricCard
          title={`Cobrados (${counts.cobrados})`}
          value={formatCurrency(totalCobrado)}
          subtitle="pagados"
          icon={<FileText className="h-5 w-5" />}
          accent="emerald"
        />
        {canViewAdmision && admissionPendingCount > 0 && (
          <Link
            href="/cobro-admision"
            className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4 transition-colors hover:shadow-md dark:border-violet-800/50 dark:from-violet-900/20 dark:to-violet-800/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-violet-600/70 dark:text-violet-400/70">Cobro admisión ({admissionPendingCount})</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(admissionPendingTotal)}</p>
                <p className="text-[10px] text-violet-600/80 dark:text-violet-400/80">Ver pendientes →</p>
              </div>
            </div>
          </Link>
        )}
        {totalExternalCost > 0 && (
          <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-amber-100/30 p-4 dark:border-amber-800/50 dark:from-amber-900/10 dark:to-amber-800/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">Lab. referidos</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalExternalCost)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pagado: {formatCurrency(paidToLabs)} • Pend.: {formatCurrency(referredBalance)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros mejorados */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-4">
          <form className="space-y-4" method="GET">
            <input type="hidden" name="tab" value={tab} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Búsqueda */}
              <div className="space-y-1.5">
                <label htmlFor="search-pagos" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                  Buscar
                </label>
                <input
                  id="search-pagos"
                  name="search"
                  defaultValue={search}
                  placeholder="Paciente, DNI u orden..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-slate-500"
                />
              </div>
              
              <FilterDateRange
                fromId="from-date"
                toId="to-date"
                defaultFrom={from}
                defaultTo={to}
              />
              
              <FilterSubmitReset
                showReset={Boolean(search || from || to)}
                resetHref={`/pagos?tab=${tab}`}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs y tabla */}
      <Card>
        <CardContent className="pt-4">
          <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-700" />}>
            <PagosTabs tab={tab} counts={counts} />
          </Suspense>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="font-semibold">Orden</TableHead>
                  <TableHead className="font-semibold">Paciente</TableHead>
                  <TableHead className="font-semibold">Sede</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Cobrado</TableHead>
                  <TableHead className="font-semibold text-right">Saldo</TableHead>
                  <TableHead className="text-center font-semibold w-20">Origen</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleOrders.length === 0 ? (
                  <EmptyTableRow
                    colSpan={10}
                    message="No hay órdenes en esta categoría"
                    className="py-12 text-center"
                    icon={<CreditCard className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />}
                  />
                ) : (
                  visibleOrders.map((order) => {
                    const sinDatosCapturados = order.status === "PENDIENTE" || order.status === "EN_PROCESO";
                    const branchName = order.branch?.name ?? order.patientType ?? "Sin sede";
                    const fromAdmission = !!order.admissionRequestId;
                    const hasReferred = order.items.some((i) => i.labTest.isReferred && i.labTest.externalLabCost);
                    return (
                      <TableRow
                        key={order.id}
                        className={`${PAYMENT_ROW_HOVER_CLASS[order.paymentStatus]} transition-colors ${sinDatosCapturados ? "bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""}`}
                        title={sinDatosCapturados ? "Orden sin datos capturados aún" : undefined}
                      >
                        <TableCell>
                          <Link
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                            href={`/orders/${order.id}`}
                          >
                            {order.orderCode}
                          </Link>
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
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="order" value={order.status} />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-200">
                          {formatCurrency(Number(order.totalPrice))}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(order.paidTotal)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-200">
                          {order.balance > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{formatCurrency(order.balance)}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(0)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {fromAdmission && (
                              <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" title="Orden de admisión">
                                <UserPlus className="h-3 w-3" />
                              </span>
                            )}
                            {hasReferred && (
                              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" title="Incluye análisis referido">
                                <FlaskConical className="h-3 w-3" />
                              </span>
                            )}
                            {!fromAdmission && !hasReferred && <span className="text-slate-400">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                              href={`/orders/${order.id}`}
                              title="Ver orden"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {canPrintTicket && (
                              <Link
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                href={`/orders/${order.id}/payment-ticket`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ticket de pago"
                              >
                                <Receipt className="h-4 w-4" />
                              </Link>
                            )}
                            <Link
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                              href={`/orders/${order.id}/print`}
                              title="Imprimir"
                            >
                              <Printer className="h-4 w-4" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
