import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, ADMIN_ROLE_CODE, hasPermission, PERMISSION_VER_ADMISION, PERMISSION_REGISTRAR_PAGOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatPatientDisplayName } from "@/lib/format";
import { calculateConventionTotal } from "@/lib/order-pricing";
import { parseLocalDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { SettleAdmissionButton } from "@/components/admisiones/SettleAdmissionButton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FileText, CalendarDays, Building2, DollarSign, FlaskConical } from "lucide-react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const dynamic = "force-dynamic";

export default async function CobroAdmisionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const canAccess =
    session?.user &&
    (session.user.roleCode === ADMIN_ROLE_CODE || hasPermission(session, PERMISSION_VER_ADMISION));
  if (!canAccess) redirect("/dashboard");

  const params = await searchParams;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const fromParam = params.from?.trim();
  const toParam = params.to?.trim();
  const dateFrom = fromParam
    ? parseLocalDate(fromParam, false)
    : (() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
      })();
  const dateTo = toParam ? parseLocalDate(toParam, true) : today;
  if (dateFrom.getTime() > dateTo.getTime()) {
    const swap = dateFrom;
    Object.assign(dateFrom, dateTo);
    Object.assign(dateTo, swap);
  }

  const pendingOrders = await prisma.labOrder.findMany({
    where: {
      admissionRequestId: { not: null },
      admissionSettledAt: null,
      status: { not: "ANULADO" },
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          labTest: {
            select: {
              id: true,
              code: true,
              name: true,
              isReferred: true,
              externalLabCost: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const settledOrders = await prisma.labOrder.findMany({
    where: {
      admissionRequestId: { not: null },
      admissionSettledAt: { not: null, gte: dateFrom, lte: dateTo },
      status: { not: "ANULADO" },
    },
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          labTest: {
            select: {
              id: true,
              isReferred: true,
              externalLabCost: true,
            },
          },
        },
      },
    },
    orderBy: { admissionSettledAt: "desc" },
    take: 100,
  });

  const orderConventionTotal = (order: {
    items: Array<{ priceSnapshot: number; priceConventionSnapshot?: number | null }>;
  }) => calculateConventionTotal(order.items);
  const totalPendiente = pendingOrders.reduce(
    (s, o) => s + orderConventionTotal(o),
    0,
  );
  const totalReferidoPendiente = pendingOrders.reduce((s, o) => {
    const cost = o.items
      .filter((i) => i.labTest.isReferred && i.labTest.externalLabCost)
      .reduce((sum, i) => sum + Number(i.labTest.externalLabCost!), 0);
    return s + cost;
  }, 0);

  const canSettle = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Cobro a admisión"
        description="Gestión de cobros a admisión"
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            <form className="flex items-center gap-2" method="GET">
              <input
                type="date"
                name="from"
                defaultValue={toYYYYMMDD(dateFrom)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                type="date"
                name="to"
                defaultValue={toYYYYMMDD(dateTo)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                Filtrar
              </button>
            </form>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pendiente de cobrar"
          value={`${pendingOrders.length} órdenes`}
          subtitle="admisión"
          icon={<FileText className="h-5 w-5" />}
          accent="amber"
        />
        <MetricCard
          title="Total a cobrar"
          value={formatCurrency(totalPendiente)}
          subtitle="precio convenio"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <MetricCard
          title="Terciarización"
          value={formatCurrency(totalReferidoPendiente)}
          subtitle="devolución interna"
          icon={<FlaskConical className="h-5 w-5" />}
          accent="blue"
        />
        <MetricCard
          title="Período"
          value={`${formatDate(dateFrom)} – ${formatDate(dateTo)}`}
          subtitle="rango activo"
          icon={<CalendarDays className="h-5 w-5" />}
          accent="sky"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pendiente de cancelar por admisión</CardTitle>
          <p className="text-sm text-slate-500">
            Órdenes provenientes de admisión. Al cobrar, marcar como &quot;saldado&quot;. El costo terciarizado se recupera como devolución interna.
          </p>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No hay órdenes pendientes de cobro a admisión.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Paciente</TableHead>
                    <TableHead className="font-semibold">Sede</TableHead>
                    <TableHead className="text-right font-semibold">Total orden (público)</TableHead>
                    <TableHead className="text-right font-semibold">A cobrar (convenio)</TableHead>
                    <TableHead className="text-right font-semibold">Terciarización</TableHead>
                    <TableHead className="w-32 text-right font-semibold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => {
                    const refCost = order.items
                      .filter((i) => i.labTest.isReferred && i.labTest.externalLabCost)
                      .reduce((s, i) => s + Number(i.labTest.externalLabCost!), 0);
                    const conventionTotal = orderConventionTotal(order);
                    const branchName = order.branch?.name ?? order.patientType ?? "—";
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDate(order.createdAt)}
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
                        <TableCell className="text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(Number(order.totalPrice))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(conventionTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {refCost > 0 ? (
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              {formatCurrency(refCost)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canSettle && (
                            <SettleAdmissionButton orderId={order.id} orderCode={order.orderCode} />
                          )}
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
          <CardTitle className="text-base">Recientemente saldadas por admisión</CardTitle>
          <p className="text-sm text-slate-500">
            Órdenes que admisión ya canceló en el período.
          </p>
        </CardHeader>
        <CardContent>
          {settledOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Sin órdenes saldadas en el período.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">Fecha saldo</TableHead>
                    <TableHead className="font-semibold">Paciente</TableHead>
                    <TableHead className="text-right font-semibold">Total orden (público)</TableHead>
                    <TableHead className="text-right font-semibold">Cobrado (convenio)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settledOrders.map((order) => {
                    const conventionTotal = orderConventionTotal(order);
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {order.admissionSettledAt
                            ? formatDate(order.admissionSettledAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatPatientDisplayName(order.patient.firstName, order.patient.lastName)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(Number(order.totalPrice))}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(conventionTotal)}
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
