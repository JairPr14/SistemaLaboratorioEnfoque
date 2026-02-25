import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, hasAnyPermission, PERMISSION_CAPTURAR_RESULTADOS, PERMISSION_QUICK_ACTIONS_ANALISTA, PERMISSION_VER_ORDENES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderAlertsCell } from "@/components/orders/OrderAlertsCell";
import { formatDate, formatPatientDisplayName } from "@/lib/format";
import { pageLayoutClasses } from "@/components/layout/PageHeader";
import { EmptyTableRow } from "@/components/common/EmptyTableRow";

export default async function PendingPage() {
  const session = await getServerSession(authOptions);
  const canView = session?.user && hasAnyPermission(session, [
    PERMISSION_VER_ORDENES,
    PERMISSION_QUICK_ACTIONS_ANALISTA,
    PERMISSION_CAPTURAR_RESULTADOS,
  ]);
  if (!canView) redirect("/dashboard");

  const orders = await prisma.labOrder.findMany({
    where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
    include: {
      patient: true,
      items: { include: { labTest: { select: { name: true, code: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className={pageLayoutClasses.wrapper}>
      <div>
        <h1 className={pageLayoutClasses.title}>Pendientes y alertas</h1>
        <p className={pageLayoutClasses.description}>
          Órdenes pendientes y en proceso. Captura resultados o valida antes de entregar.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>

        </CardHeader>
        <CardContent>
          <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-600 overflow-hidden">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Análisis</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <EmptyTableRow colSpan={7} message="No hay órdenes pendientes." />
                ) : (
                  orders.map((order) => {
                    const totalTests = order.items?.length ?? 0;
                    const completedTests =
                      order.items?.filter((i) => i.status === "COMPLETADO").length ?? 0;
                    const needsValidation =
                      totalTests > 0 && completedTests === totalTests && order.status === "EN_PROCESO";
                    const missingCount = totalTests - completedTests;
                    const analyses =
                      order.items
                        ?.map((i) => i.labTest?.name ?? i.labTest?.code ?? "-")
                        .filter(Boolean)
                        .join(", ") || "—";

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                            href={`/orders/${order.id}`}
                          >
                            {order.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                          {formatPatientDisplayName(order.patient.firstName, order.patient.lastName)}
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-slate-700 dark:text-slate-300" title={analyses}>
                          {analyses}
                        </TableCell>
                        <TableCell>
                          <OrderAlertsCell
                            order={{
                              status: order.status,
                              createdAt: order.createdAt,
                              deliveredAt: order.deliveredAt ?? undefined,
                              totalTests,
                              completedTests,
                              needsValidation,
                              missingCount,
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
                          >
                            Ver / Capturar resultados
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
    </div>
  );
}
