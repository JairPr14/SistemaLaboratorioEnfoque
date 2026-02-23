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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Pagos / Cobros</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
            method="GET"
          >
            <input type="hidden" name="tab" value={tab} />
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar por paciente u orden..."
              className="h-9 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
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
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700"
            >
              Filtrar
            </button>
            {(search || from || to) && (
              <Link
                href={`/pagos?tab=${tab}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 hover:bg-slate-100"
              >
                Borrar filtros
              </Link>
            )}
          </form>
          {canRegisterPayment && <RegistrarpagoButton />}
        </div>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-700" />}>
          <PagosTabs tab={tab} counts={counts} />
        </Suspense>
        <div className="mt-4 overflow-x-auto -mx-1">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cobrado</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay órdenes en esta categoría
                  </TableCell>
                </TableRow>
              ) : (
                visibleOrders.map((order) => {
                  const isPendiente = order.status === "PENDIENTE";
                  const isEntregado = order.status === "ENTREGADO";
                  const rowClass = isPendiente
                    ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                    : isEntregado
                      ? "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "";
                  return (
                    <TableRow key={order.id} className={rowClass}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline text-slate-900 dark:text-slate-100"
                          href={`/orders/${order.id}`}
                        >
                          {order.orderCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {order.patient.firstName} {order.patient.lastName}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "PENDIENTE"
                              ? "warning"
                              : order.status === "ENTREGADO"
                                ? "success"
                                : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-200">
                        {formatCurrency(Number(order.totalPrice))}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {formatCurrency(order.paidTotal)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-200">
                        {formatCurrency(order.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="mr-2 text-sm text-slate-600 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                          href={`/orders/${order.id}`}
                        >
                          Ver
                        </Link>
                        {canPrintTicket && (
                          <Link
                            className="mr-2 text-sm text-slate-600 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                            href={`/orders/${order.id}/payment-ticket`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ticket pago
                          </Link>
                        )}
                        <Link
                          className="text-sm text-slate-600 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                          href={`/orders/${order.id}/print`}
                        >
                          Imprimir
                        </Link>
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
  );
}
