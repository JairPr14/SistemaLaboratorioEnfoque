import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; from?: string; to?: string };
}) {
  const search = searchParams.search?.trim();
  const status = searchParams.status?.trim();
  const from = searchParams.from?.trim();
  const to = searchParams.to?.trim();

  const orders = await prisma.labOrder.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderCode: { contains: search } },
              {
                patient: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { dni: { contains: search } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    include: { patient: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Órdenes de laboratorio</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <form className="flex flex-wrap items-center gap-2" method="GET">
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar por paciente u orden..."
              className="h-9 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
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
            <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              Filtrar
            </button>
          </form>
          <Link
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            href="/orders/new"
          >
            Nueva orden
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
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
                    className={`hover:underline font-medium ${isPendiente ? "text-amber-800 dark:text-amber-200" : isEntregado ? "text-emerald-800 dark:text-emerald-200" : ""}`}
                    href={`/orders/${order.id}`}
                  >
                    {order.orderCode}
                  </Link>
                </TableCell>
                <TableCell className={isPendiente ? "text-amber-800 dark:text-amber-200" : isEntregado ? "text-emerald-800 dark:text-emerald-200" : ""}>
                  {order.patient.firstName} {order.patient.lastName}
                </TableCell>
                <TableCell className={isPendiente ? "text-amber-700 dark:text-amber-300" : isEntregado ? "text-emerald-700 dark:text-emerald-300" : ""}>
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{order.status}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(Number(order.totalPrice))}</TableCell>
                <TableCell className="text-right">
                  <Link className="text-sm text-slate-600 hover:underline mr-2" href={`/orders/${order.id}/print`}>
                    Imprimir
                  </Link>
                  <DeleteButton url={`/api/orders/${order.id}`} label="Eliminar" />
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
