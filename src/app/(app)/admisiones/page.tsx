import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Search, Filter, RotateCcw, Clock, CheckCircle, XCircle, FileText } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  authOptions,
  hasPermission,
  PERMISSION_CONVERTIR_ADMISION_A_ORDEN,
  PERMISSION_GESTIONAR_ADMISION,
  PERMISSION_VER_ADMISION,
} from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { AdmissionActions } from "@/components/admisiones/AdmissionActions";

type SearchParams = Promise<{
  status?: string;
  search?: string;
}>;

export const dynamic = "force-dynamic";

export default async function AdmisionesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  const canView = hasPermission(session, PERMISSION_VER_ADMISION);
  const canManage = hasPermission(session, PERMISSION_GESTIONAR_ADMISION);
  const canConvert = hasPermission(session, PERMISSION_CONVERTIR_ADMISION_A_ORDEN);

  if (!canView && !canManage) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = params.status?.trim() ?? "PENDIENTE";
  const search = params.search?.trim() || "";

  const statusOrder = { PENDIENTE: 0, CONVERTIDA: 1, CANCELADA: 2 };
  const [itemsRaw, summary] = await Promise.all([
    prisma.admissionRequest.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { requestCode: { contains: search, mode: "insensitive" } },
                { patient: { dni: { contains: search, mode: "insensitive" } } },
                { patient: { firstName: { contains: search, mode: "insensitive" } } },
                { patient: { lastName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        patient: true,
        branch: true,
        items: { include: { labTest: true }, orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.admissionRequest.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const summaryCount = {
    pendientes: summary.find((row) => row.status === "PENDIENTE")?._count.id ?? 0,
    convertidas: summary.find((row) => row.status === "CONVERTIDA")?._count.id ?? 0,
    canceladas: summary.find((row) => row.status === "CANCELADA")?._count.id ?? 0,
  };

  const items = [...itemsRaw].sort((a, b) => {
    const ordA = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const ordB = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    if (ordA !== ordB) return ordA - ordB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Admisión"
        description="Pre-órdenes del área admisionista para envío a laboratorio"
        actions={
          canManage ? (
            <Link
              href="/admisiones/nueva"
              className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Nueva pre-orden
            </Link>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/admisiones" className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 sm:min-w-[200px]">
              <label htmlFor="adm-search" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="adm-search"
                  name="search"
                  defaultValue={search}
                  placeholder="Código, paciente o DNI"
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="adm-status" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Estado
              </label>
              <select
                id="adm-status"
                name="status"
                defaultValue={status}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONVERTIDA">Convertida</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="">Todos</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
              {(search || status !== "PENDIENTE") && (
                <Link
                  href="/admisiones"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admisiones?status=PENDIENTE"
          className={`rounded-xl border-2 transition-all hover:shadow-md ${
            status === "PENDIENTE"
              ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20"
              : "border-slate-200 hover:border-amber-300 dark:border-slate-700 dark:hover:border-amber-700"
          }`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summaryCount.pendientes}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/admisiones?status=CONVERTIDA"
          className={`rounded-xl border-2 transition-all hover:shadow-md ${
            status === "CONVERTIDA"
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20"
              : "border-slate-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-700"
          }`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Convertidas</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summaryCount.convertidas}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/admisiones?status=CANCELADA"
          className={`rounded-xl border-2 transition-all hover:shadow-md ${
            status === "CANCELADA"
              ? "border-slate-400 bg-slate-100 dark:border-slate-600 dark:bg-slate-800/50"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <XCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Canceladas</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{summaryCount.canceladas}</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Bandeja de pre-órdenes</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {items.length > 0
              ? `Mostrando ${items.length} pre-orden${items.length === 1 ? "" : "es"}`
              : "Ajusta los filtros para ver resultados"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-12 text-center font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Paciente</TableHead>
                  <TableHead className="font-semibold">Sede</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <FileText className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          No hay pre-órdenes con esos filtros
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {status === "PENDIENTE"
                            ? "Las pre-órdenes pendientes aparecerán aquí. Prueba con otro estado o crea una nueva."
                            : "Cambia el estado del filtro o la búsqueda para ver más resultados."}
                        </p>
                        {canManage && (
                          <Link
                            href="/admisiones/nueva"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                          >
                            Nueva pre-orden
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                          {item.requestCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.patient.lastName} {item.patient.firstName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">DNI {item.patient.dni}</p>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{item.branch?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "PENDIENTE"
                              ? "warning"
                              : item.status === "CONVERTIDA"
                                ? "success"
                                : "secondary"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                      <TableCell className="text-right">
                        <AdmissionActions
                          admissionId={item.id}
                          status={item.status}
                          convertedOrderId={item.convertedOrderId}
                          canConvert={canConvert}
                          canManage={canManage}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
