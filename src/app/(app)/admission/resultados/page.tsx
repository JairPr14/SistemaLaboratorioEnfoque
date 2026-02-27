import Link from "next/link";
import { redirect } from "next/navigation";


import {
  getServerSession, hasPermission,
  PERMISSION_VER_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPatientDisplayName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { FileCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultadosListosPage() {
  const session = await getServerSession();
  const canAccess =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_ADMISION) ||
      hasPermission(session, PERMISSION_GESTIONAR_ADMISION));
  if (!canAccess) redirect("/dashboard");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.labOrder.findMany({
    where: {
      orderSource: "ADMISION",
      status: "COMPLETADO",
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          result: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Resultados listos"
        description="Órdenes de admisión con resultados completados. Puede imprimir o avisar al paciente."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Órdenes completadas hoy</CardTitle>
          <p className="text-sm text-slate-500">
            Resultados listos para entrega o notificación al paciente.
          </p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <FileCheck className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No hay órdenes con resultados listos hoy.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Orden</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Paciente</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
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
                        <Badge variant="success">Completado</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/orders/${order.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
                        >
                          Imprimir
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
