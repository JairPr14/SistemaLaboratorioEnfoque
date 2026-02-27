import Link from "next/link";
import { redirect } from "next/navigation";


import {
  getServerSession, hasPermission,
  PERMISSION_VER_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDniDisplay, formatPatientDisplayName } from "@/lib/format";
import { calculateConventionTotal } from "@/lib/order-pricing";
import { parseLocalDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { DollarSign, UserCheck, CalendarDays, Building2 } from "lucide-react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const dynamic = "force-dynamic";

export default async function PacientesDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getServerSession();
  const canAccess =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_ADMISION) ||
      hasPermission(session, PERMISSION_GESTIONAR_ADMISION));
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
        d.setHours(0, 0, 0, 0);
        return d;
      })();
  const dateTo = toParam ? parseLocalDate(toParam, true) : today;

  const orders = await prisma.labOrder.findMany({
    where: {
      orderSource: "ADMISION",
      status: { not: "ANULADO" },
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      patient: true,
      branch: true,
      items: true,
    },
    orderBy: [{ patient: { lastName: "asc" } }, { patient: { firstName: "asc" } }, { createdAt: "asc" }],
  });

  const orderConventionTotal = (o: { items: Array<{ priceSnapshot: number; priceConventionSnapshot?: number | null }> }) =>
    calculateConventionTotal(o.items);
  const totalConvenio = orders.reduce((s, o) => s + orderConventionTotal(o), 0);
  const totalPublico = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
  const pacientesUnicos = new Set(orders.map((o) => o.patientId)).size;

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Pacientes del día"
        description="Listado de pacientes registrados por admisión. Monto convenio = lo que laboratorio cobrará a admisión."
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total convenio</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalConvenio)}
                </p>
                <p className="text-xs text-slate-500">A cobrar por laboratorio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-slate-400" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <DollarSign className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total público</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(totalPublico)}
                </p>
                <p className="text-xs text-slate-500">Cobrado al paciente</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pacientesUnicos}</p>
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
          <CardTitle className="text-base">Lista de pacientes</CardTitle>
          <p className="text-sm text-slate-500">
            Órdenes creadas desde admisión. Lab cobrará el total convenio.
          </p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <UserCheck className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No hay órdenes de admisión en el período.</p>
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
                    <TableHead className="text-right font-semibold">Total (público)</TableHead>
                    <TableHead className="text-right font-semibold">Convenio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const branchName = order.branch?.name ?? "—";
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
                          {formatCurrency(orderConventionTotal(order))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-slate-50 font-semibold dark:bg-slate-800/50">
                    <TableCell colSpan={5} className="text-right">
                      Total:
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPublico)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalConvenio)}
                    </TableCell>
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
