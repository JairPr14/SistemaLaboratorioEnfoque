import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

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

export default async function AdmisionesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  const canView = hasPermission(session, PERMISSION_VER_ADMISION);
  const canManage = hasPermission(session, PERMISSION_GESTIONAR_ADMISION);
  const canConvert = hasPermission(session, PERMISSION_CONVERTIR_ADMISION_A_ORDEN);

  if (!canView && !canManage) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = params.status?.trim() || "";
  const search = params.search?.trim() || "";

  const [items, summary] = await Promise.all([
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

      <Card>
        <CardContent className="pt-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar por código, paciente o DNI"
              className="h-9 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONVERTIDA">Convertida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white dark:bg-teal-600"
            >
              Filtrar
            </button>
            {(search || status) && (
              <Link
                href="/admisiones"
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm dark:border-slate-600"
              >
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{summaryCount.pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Convertidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{summaryCount.convertidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-500">{summaryCount.canceladas}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bandeja de pre-órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead>Código</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      No hay pre-órdenes con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.requestCode}</TableCell>
                      <TableCell>
                        {item.patient.lastName} {item.patient.firstName}
                        <p className="text-xs text-slate-500">DNI {item.patient.dni}</p>
                      </TableCell>
                      <TableCell>{item.branch?.name ?? "Sin sede"}</TableCell>
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
