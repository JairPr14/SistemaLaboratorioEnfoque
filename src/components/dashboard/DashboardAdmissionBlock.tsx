import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, DollarSign, UserPlus, CalendarDays, Filter } from "lucide-react";
import { formatDate } from "@/lib/format";

type AdmissionListItem = {
  id: string;
  requestCode: string;
  status: string;
  patientName: string;
  totalPrice: string;
  createdAt: Date;
  createdByName: string;
  convertedOrderId?: string;
  /** Si la orden tiene todos los resultados listos (no borrador), se puede ver impresión */
  orderPrintReady?: boolean;
};

type Props = {
  pendingCount: number;
  convertedToday: number;
  pendingSettlementCount: number;
  recentAdmissions: Array<{
    id: string;
    requestCode: string;
    status: string;
    patientName: string;
    totalPrice: string;
  }>;
  admissionsList: AdmissionListItem[];
  admissionDateFrom: string;
  admissionDateTo: string;
  canManage: boolean;
  canConvert: boolean;
};

export function DashboardAdmissionBlock({
  pendingCount,
  convertedToday,
  pendingSettlementCount,
  recentAdmissions,
  admissionsList,
  admissionDateFrom,
  admissionDateTo,
  canManage,
  canConvert,
}: Props) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-700/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div>
          <CardTitle className="text-base">Admisión</CardTitle>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5">
            Órdenes de admisión (pacientes existentes y nuevos) listadas por personal de admisión
          </p>
        </div>
        <Link
          href="/admisiones"
          className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline shrink-0 transition-colors"
        >
          Ver bandeja
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Órdenes pendientes</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Convertidas hoy</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{convertedToday}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pend. cobro admisión</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pendingSettlementCount}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Filtro por fecha</p>
          <form method="get" action="/dashboard" className="flex flex-wrap items-end gap-2">
            <div className="min-w-[130px]">
              <label htmlFor="adm-from-dash" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                Desde
              </label>
              <input
                id="adm-from-dash"
                name="admissionFrom"
                type="date"
                defaultValue={admissionDateFrom}
                className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="min-w-[130px]">
              <label htmlFor="adm-to-dash" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Hasta
              </label>
              <input
                id="adm-to-dash"
                name="admissionTo"
                type="date"
                defaultValue={admissionDateTo}
                className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Órdenes de admisión (más recientes primero)
          </p>
          {admissionsList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay órdenes de admisión en el rango de fechas seleccionado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Paciente</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Personal admisión</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold">Orden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissionsList.map((a) => (
                  <TableRow key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <TableCell>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm dark:bg-slate-700">
                        {a.requestCode}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{a.patientName}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{a.createdByName}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          a.status === "CONVERTIDA"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : a.status === "CANCELADA"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {a.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">{a.totalPrice}</TableCell>
                    <TableCell className="text-right">
                      {a.convertedOrderId ? (
                        a.orderPrintReady ? (
                          <Link
                            href={`/orders/${a.convertedOrderId}/print`}
                            className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
                          >
                            Ver orden
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400" title="Resultados aún no listos">
                            Resultados pendientes
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          {canManage && (
            <Link href="/admisiones/nueva">
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Nueva orden
              </Button>
            </Link>
          )}
          <Link href="/admisiones">
            <Button size="sm" variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Bandeja de admisión
            </Button>
          </Link>
          <Link href="/cobro-admision">
            <Button size="sm" variant="outline" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Cobro admisión
              {pendingSettlementCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  {pendingSettlementCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
