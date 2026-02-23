import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions, hasPermission, PERMISSION_ELIMINAR_REGISTROS, PERMISSION_REGISTRAR_PAGOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { RegistrarpagoButton } from "@/components/pagos/RegistrarpagoButton";

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
    focusSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const status = params.status?.trim();
  const paymentStatus = params.paymentStatus?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const focusSearch = params.focusSearch === "1";
  const session = await getServerSession(authOptions);
  const canDeleteOrders = hasPermission(session, PERMISSION_ELIMINAR_REGISTROS);
  const canRegisterPayment = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  const dateFrom = from ? parseLocalDate(from, false) : null;
  const dateTo = to ? parseLocalDate(to, true) : null;

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
    orderBy: { createdAt: "desc" },
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
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Órdenes de laboratorio</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2" method="GET">
            <input
              name="search"
              defaultValue={search}
              autoFocus={focusSearch}
              placeholder="Buscar por paciente u orden..."
              className="h-9 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <select
              name="status"
              defaultValue={status || ""}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_PROCESO">EN_PROCESO</option>
              <option value="COMPLETADO">COMPLETADO</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
            <select
              name="paymentStatus"
              defaultValue={paymentStatus || ""}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Cobro: todos</option>
              <option value="PENDIENTE">Cobro pendiente</option>
              <option value="PARCIAL">Cobro parcial</option>
              <option value="PAGADO">Cobrado completo</option>
            </select>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button type="submit" className="rounded-md bg-slate-900 dark:bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-700">
              Filtrar
            </button>
            {(search || status || paymentStatus || from || to) && (
              <Link
                href="/orders"
                className="rounded-md border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Borrar filtros
              </Link>
            )}
          </form>
          {canRegisterPayment && <RegistrarpagoButton />}
          <Link
            className="rounded-md bg-slate-900 dark:bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-teal-700"
            href="/orders/new"
          >
            Nueva orden
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-1">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cobro</TableHead>
              <TableHead>Análisis</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOrders.map((order) => {
              const isPendiente = order.status === "PENDIENTE";
              const isEntregado = order.status === "ENTREGADO";
              const rowClass = isPendiente
                ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : isEntregado
                  ? "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "";
              const statusVariant =
                order.status === "PENDIENTE"
                  ? "warning"
                  : order.status === "ENTREGADO"
                    ? "success"
                    : "secondary";
              return (
              <TableRow key={order.id} className={rowClass}>
                <TableCell>
                  <Link
                    className={`hover:underline font-medium ${isPendiente ? "text-amber-800 dark:text-amber-200" : isEntregado ? "text-emerald-800 dark:text-emerald-200" : "text-slate-900 dark:text-slate-100"}`}
                    href={`/orders/${order.id}`}
                  >
                    {order.orderCode}
                  </Link>
                </TableCell>
                <TableCell className={isPendiente ? "text-amber-800 dark:text-amber-200" : isEntregado ? "text-emerald-800 dark:text-emerald-200" : "text-slate-900 dark:text-slate-200"}>
                  {order.patient.firstName} {order.patient.lastName}
                </TableCell>
                <TableCell className={isPendiente ? "text-amber-700 dark:text-amber-300" : isEntregado ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}>
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.paymentStatus === "PAGADO"
                        ? "success"
                        : order.paymentStatus === "PARCIAL"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {order.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-slate-700 dark:text-slate-300" title={order.items.map((i) => i.labTest?.name ?? i.labTest?.code ?? "-").join(", ")}>
                  {order.items.length === 0
                    ? "—"
                    : order.items.map((i) => i.labTest?.name ?? i.labTest?.code ?? "-").join(", ")}
                </TableCell>
                <TableCell className="text-slate-900 dark:text-slate-200">
                  <div className="leading-tight">
                    <p>{formatCurrency(Number(order.totalPrice))}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cobrado: {formatCurrency(order.paidTotal)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline mr-2" href={`/orders/${order.id}/print`}>
                    Imprimir
                  </Link>
                  {canDeleteOrders && (
                    <DeleteButton url={`/api/orders/${order.id}`} label="Eliminar" />
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
