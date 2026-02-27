import Link from "next/link";
import { redirect } from "next/navigation";


import {
  getServerSession, ADMIN_ROLE_CODE,
  hasPermission,
  PERMISSION_VER_ADMISION,
  PERMISSION_COBRO_ADMISION,
  PERMISSION_REGISTRAR_PAGOS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDniDisplay, formatPatientDisplayName } from "@/lib/format";
import { calculateConventionTotal } from "@/lib/order-pricing";
import { parseLocalDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { SettleAdmissionButton } from "@/components/admisiones/SettleAdmissionButton";
import { CalendarDays, Building2, DollarSign, FlaskConical, UserCheck } from "lucide-react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const dynamic = "force-dynamic";

export default async function LaboratorioPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getServerSession();
  const canAccess =
    session?.user &&
    (session.user.roleCode === ADMIN_ROLE_CODE || hasPermission(session, PERMISSION_VER_ADMISION) || hasPermission(session, PERMISSION_COBRO_ADMISION));
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
      orderSource: "ADMISION",
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
    orderBy: [{ patient: { lastName: "asc" } }, { patient: { firstName: "asc" } }, { createdAt: "asc" }],
  });

  const orderConventionTotal = (order: {
    items: Array<{ priceSnapshot: number; priceConventionSnapshot?: number | null }>;
  }) => calculateConventionTotal(order.items);

  const totalPendiente = pendingOrders.reduce((s, o) => s + orderConventionTotal(o), 0);

  const canSettle = hasPermission(session, PERMISSION_COBRO_ADMISION) || hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Laboratorio"
        description="Pacientes registrados por admisión con órdenes pendientes de cobro"
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
        <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800/50">
          <div className="h-1 bg-emerald-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total a cobrar a admisión
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalPendiente)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingOrders.length} orden(es) • precio convenio
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-slate-400" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <UserCheck className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pacientes</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {new Set(pendingOrders.map((o) => o.patientId)).size}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  registrados por admisión
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-slate-400" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <CalendarDays className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Período</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(dateFrom)} – {formatDate(dateTo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de pacientes por cobrar a admisión</CardTitle>
          <p className="text-sm text-slate-500">
            Órdenes generadas desde admisión. Cobra el total (precio convenio) a admisión.
          </p>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center">
              <FlaskConical className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">
                No hay órdenes pendientes de cobro a admisión.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Las órdenes desde admisión aparecerán aquí hasta que se marquen como saldadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Paciente</TableHead>
                    <TableHead className="font-semibold">DNI</TableHead>
                    <TableHead className="font-semibold">Sede</TableHead>
                    <TableHead className="text-right font-semibold">Total orden (público)</TableHead>
                    <TableHead className="text-right font-semibold">A cobrar (convenio)</TableHead>
                    {canSettle && (
                      <TableHead className="w-32 text-right font-semibold">Acción</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => {
                    const conventionTotal = orderConventionTotal(order);
                    const branchName = order.branch?.name ?? order.patientType ?? "—";
                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
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
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {formatDniDisplay(order.patient.dni)}
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
                        {canSettle && (
                          <TableCell className="text-right">
                            <SettleAdmissionButton
                              orderId={order.id}
                              orderCode={order.orderCode}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-slate-50 font-semibold dark:bg-slate-800/50">
                    <TableCell colSpan={6} className="text-right">
                      Total a cobrar:
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalPendiente)}
                    </TableCell>
                    {canSettle && <TableCell />}
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
