import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";

import { redirect } from "next/navigation";
import { authOptions, hasPermission, PERMISSION_IMPRIMIR_TICKET_PAGO, PERMISSION_REGISTRAR_PAGOS, PERMISSION_VER_PAGOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RegistrarpagoButton } from "@/components/pagos/RegistrarpagoButton";
import { PagosTabs } from "@/components/pagos/PagosTabs";
import { Search, CalendarDays, Filter, X, Eye, Printer, Receipt, Building2, DollarSign, FileText, CreditCard } from "lucide-react";

/** Parsea "YYYY-MM-DD" en hora local y devuelve inicio (00:00:00) o fin (23:59:59.999) del día */
function parseLocalDate(dateStr: string, endOfDay: boolean): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date(dateStr);
  }
  const date = new Date(y, m - 1, d);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

type TabValue = "pendientes" | "parcial" | "cobrados";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const validTabs: TabValue[] = ["pendientes", "parcial", "cobrados"];
  const tabParam = params.tab?.toLowerCase();
  const tab = validTabs.includes(tabParam as TabValue) ? (tabParam as TabValue) : "pendientes";
  const search = params.search?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const session = await getServerSession(authOptions);
  const canAccessPagos = hasPermission(session, PERMISSION_VER_PAGOS) || hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  if (!canAccessPagos) redirect("/dashboard");
  const canRegisterPayment = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  const canPrintTicket = hasPermission(session, PERMISSION_IMPRIMIR_TICKET_PAGO) || canAccessPagos;

  const dateFrom = from ? parseLocalDate(from, false) : null;
  const dateTo = to ? parseLocalDate(to, true) : null;

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
      items: { include: { labTest: { select: { code: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderIds = orders.map((o) => o.id);
  const paidByOrder = await getPaidTotalsByOrderIds(prisma, orderIds);

  const ordersWithPayment = orders.map((order) => {
    const paid = paidByOrder.get(order.id) ?? 0;
    const total = Number(order.totalPrice);
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

      {/* Cards de resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 dark:border-amber-800/50 dark:from-amber-900/20 dark:to-amber-800/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">Pendientes ({counts.pendientes})</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalPendiente)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-blue-800/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70">Parcial ({counts.parcial})</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalParcial)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 dark:border-emerald-800/50 dark:from-emerald-900/20 dark:to-emerald-800/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Cobrados ({counts.cobrados})</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalCobrado)}</p>
            </div>
          </div>
        </div>
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
              
              {/* Fecha desde */}
              <div className="space-y-1.5">
                <label htmlFor="from-date" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Desde
                </label>
                <input
                  id="from-date"
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
              
              {/* Fecha hasta */}
              <div className="space-y-1.5">
                <label htmlFor="to-date" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Hasta
                </label>
                <input
                  id="to-date"
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
              
              {/* Botones */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  <Filter className="h-4 w-4" />
                  Filtrar
                </button>
                {(search || from || to) && (
                  <Link
                    href={`/pagos?tab=${tab}`}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </Link>
                )}
              </div>
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
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <CreditCard className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">No hay órdenes en esta categoría</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleOrders.map((order) => {
                    const statusColors: Record<string, string> = {
                      PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      EN_PROCESO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      COMPLETADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      ENTREGADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      ANULADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    };
                    const paymentRowColors: Record<string, string> = {
                      PENDIENTE: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
                      PARCIAL: "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                      PAGADO: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                    };
                    const branchName = order.branch?.name ?? order.patientType ?? "Sin sede";
                    return (
                      <TableRow key={order.id} className={`${paymentRowColors[order.paymentStatus]} transition-colors`}>
                        <TableCell>
                          <Link
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                            href={`/orders/${order.id}`}
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {order.patient.firstName} {order.patient.lastName}
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
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                            {order.status}
                          </span>
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
