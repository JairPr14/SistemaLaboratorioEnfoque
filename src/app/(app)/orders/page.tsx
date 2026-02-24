import Link from "next/link";
import { getServerSession } from "next-auth";

import { redirect } from "next/navigation";
import { authOptions, hasPermission, PERMISSION_ELIMINAR_REGISTROS, PERMISSION_REGISTRAR_PAGOS, PERMISSION_VER_ORDENES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { RegistrarpagoButton } from "@/components/pagos/RegistrarpagoButton";
import { Search, CalendarDays, Filter, X, Plus, Printer, Activity, CreditCard, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    sortDir?: string;
    focusSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const status = params.status?.trim();
  const paymentStatus = params.paymentStatus?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const sortBy = params.sortBy?.trim() || "createdAt";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";
  const focusSearch = params.focusSearch === "1";
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session, PERMISSION_VER_ORDENES)) {
    redirect("/dashboard");
  }
  const canDeleteOrders = hasPermission(session, PERMISSION_ELIMINAR_REGISTROS);
  const canRegisterPayment = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  const dateFrom = from ? parseLocalDate(from, false) : null;
  const dateTo = to ? parseLocalDate(to, true) : null;

  const orderByField =
    sortBy === "orderCode"
      ? { orderCode: sortDir }
      : sortBy === "patient"
        ? { patient: { lastName: sortDir } }
        : { createdAt: sortDir };

  const orders = await prisma.labOrder.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
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
      items: { include: { labTest: { select: { code: true, name: true } } } },
    },
    orderBy: orderByField,
  });

  const orderIds = orders.map((o) => o.id);
  const paidByOrder = await getPaidTotalsByOrderIds(prisma, orderIds);

  const ordersWithPayment = orders.map((order) => {
    const paid = paidByOrder.get(order.id) ?? 0;
    const total = Number(order.totalPrice);
    const status =
      paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
    return {
      ...order,
      paidTotal: paid,
      balance: Math.max(0, total - paid),
      paymentStatus: status as "PENDIENTE" | "PARCIAL" | "PAGADO",
    };
  });

  const visibleOrders = paymentStatus
    ? ordersWithPayment.filter((o) => o.paymentStatus === paymentStatus)
    : ordersWithPayment;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Órdenes de laboratorio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de órdenes y análisis</p>
        </div>
        <div className="flex items-center gap-2">
          {canRegisterPayment && <RegistrarpagoButton />}
          <Link
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
            href="/orders/new"
          >
            <Plus className="h-4 w-4" />
            Nueva orden
          </Link>
        </div>
      </div>

      {/* Filtros (mismo estilo que Pagos) */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-4">
          <form className="space-y-4" method="GET">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Búsqueda */}
              <div className="space-y-1.5">
                <label htmlFor="search-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                  Buscar
                </label>
                <input
                  id="search-orders"
                  name="search"
                  defaultValue={search}
                  autoFocus={focusSearch}
                  placeholder="Paciente, DNI u orden..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-slate-500"
                />
              </div>

              {/* Fecha desde */}
              <div className="space-y-1.5">
                <label htmlFor="from-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Desde
                </label>
                <input
                  id="from-orders"
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-1.5">
                <label htmlFor="to-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Hasta
                </label>
                <input
                  id="to-orders"
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
                {(search || status || paymentStatus || from || to || sortBy !== "createdAt" || sortDir !== "desc") && (
                  <Link
                    href="/orders"
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </Link>
                )}
              </div>
            </div>
            {/* Fila extra: Estado, Cobro, Ordenar */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <label htmlFor="status-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Activity className="h-3.5 w-3.5" />
                  Estado
                </label>
                <select
                  id="status-orders"
                  name="status"
                  defaultValue={status || ""}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="COMPLETADO">Completado</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="ANULADO">Anulado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="payment-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CreditCard className="h-3.5 w-3.5" />
                  Cobro
                </label>
                <select
                  id="payment-orders"
                  name="paymentStatus"
                  defaultValue={paymentStatus || ""}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Por cobrar</option>
                  <option value="PARCIAL">Parcial</option>
                  <option value="PAGADO">Cobrado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sortBy-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Ordenar por
                </label>
                <select
                  id="sortBy-orders"
                  name="sortBy"
                  defaultValue={sortBy}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="createdAt">Fecha</option>
                  <option value="orderCode">Código orden</option>
                  <option value="patient">Paciente</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sortDir-orders" className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  Orden
                </label>
                <select
                  id="sortDir-orders"
                  name="sortDir"
                  defaultValue={sortDir}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabla (mismo estilo que Pagos) */}
      <Card>
        <CardContent className="pt-4">
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-12 font-semibold text-center">#</TableHead>
                  <TableHead className="font-semibold">Orden</TableHead>
                  <TableHead className="font-semibold">Paciente</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Cobro</TableHead>
                  <TableHead className="font-semibold">Análisis</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Cobrado</TableHead>
                  <TableHead className="font-semibold text-right">Saldo</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12 text-center">
                      <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">No se encontraron órdenes</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleOrders.map((order, idx) => {
                    const statusColors: Record<string, string> = {
                      PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      EN_PROCESO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      COMPLETADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      ENTREGADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      ANULADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    };
                    const paymentColors: Record<string, string> = {
                      PENDIENTE: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
                      PARCIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      PAGADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    };
                    const paymentRowColors: Record<string, string> = {
                      PENDIENTE: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
                      PARCIAL: "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                      PAGADO: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                    };
                    const sinDatosCapturados = order.status === "PENDIENTE" || order.status === "EN_PROCESO";
                    return (
                      <TableRow
                        key={order.id}
                        className={`${paymentRowColors[order.paymentStatus]} transition-colors ${sinDatosCapturados ? "bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""}`}
                        title={sinDatosCapturados ? "Orden sin datos capturados aún" : undefined}
                      >
                        <TableCell className="text-center text-slate-500 dark:text-slate-400 font-medium">
                          {idx + 1}
                        </TableCell>
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
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${paymentColors[order.paymentStatus]}`}>
                            {order.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate text-sm text-slate-600 dark:text-slate-400 max-w-[180px]" title={order.items.map((i) => i.labTest?.name ?? i.labTest?.code ?? "-").join(", ")}>
                            {order.items.length === 0
                              ? "—"
                              : order.items.map((i) => i.labTest?.name ?? i.labTest?.code ?? "-").join(", ")}
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
                              href={`/orders/${order.id}/print`}
                              title="Imprimir"
                            >
                              <Printer className="h-4 w-4" />
                            </Link>
                            {canDeleteOrders && (
                              <DeleteButton url={`/api/orders/${order.id}`} label="Eliminar" />
                            )}
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
