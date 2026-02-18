import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderAlertsCell } from "@/components/orders/OrderAlertsCell";
import { formatDate } from "@/lib/format";
import { pageLayoutClasses } from "@/components/layout/PageHeader";

export default async function PendingPage() {
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
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Solo se muestran órdenes con estado PENDIENTE o EN_PROCESO.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-600 overflow-hidden">
            <Table>
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
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay órdenes pendientes.
                    </TableCell>
                  </TableRow>
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
                        <TableCell className="text-slate-900 dark:text-slate-200">
                          {order.patient.firstName} {order.patient.lastName}
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
