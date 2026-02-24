import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasAnyPermission, PERMISSION_VER_ORDENES, PERMISSION_QUICK_ACTIONS_ENTREGA } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function getOrderDateKey(order: { deliveredAt: Date | null; createdAt: Date }) {
  const d = order.deliveredAt ?? order.createdAt;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default async function DeliveredPage() {
  const session = await getServerSession(authOptions);
  const canView =
    session?.user &&
    hasAnyPermission(session, [PERMISSION_VER_ORDENES, PERMISSION_QUICK_ACTIONS_ENTREGA]);
  if (!canView) {
    redirect("/dashboard");
  }
  const orders = await prisma.labOrder.findMany({
    where: { status: "ENTREGADO" },
    include: {
      patient: true,
      items: {
        include: {
          labTest: { include: { section: true } },
          result: { include: { items: true } },
        },
      },
    },
    orderBy: [{ deliveredAt: "desc" }, { updatedAt: "desc" }],
  });

  const grouped = new Map<string, typeof orders>();
  for (const order of orders) {
    const key = `${order.patientId}-${getOrderDateKey(order)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(order);
  }

  const groups = Array.from(grouped.entries()).map(([key, ordersInGroup]) => {
    const patient = ordersInGroup[0]!.patient;
    const dateKey = getOrderDateKey(ordersInGroup[0]!);
    const displayDate = ordersInGroup[0]!.deliveredAt
      ? formatDate(ordersInGroup[0]!.deliveredAt)
      : formatDate(ordersInGroup[0]!.createdAt);
    return {
      key,
      patientName: `${patient.lastName} ${patient.firstName}`,
      patientDni: patient.dni,
      displayDate,
      dateKey,
      orders: ordersInGroup,
    };
  });

  groups.sort((a, b) => {
    const d = b.dateKey.localeCompare(a.dateKey);
    if (d !== 0) return d;
    return a.patientName.localeCompare(b.patientName);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis entregados</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Órdenes con estado ENTREGADO, agrupadas por paciente y día (más recientes primero).
        </p>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p>No hay órdenes entregadas registradas.</p>
            <p className="text-sm mt-2">
              Las órdenes marcadas como &quot;Entregado&quot; aparecerán aquí.
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-block text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
            >
              Ir a Órdenes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {group.patientName}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">DNI {group.patientDni}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.displayDate}
                  </Badge>
                  {group.orders.length > 1 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {group.orders.length} órdenes en este día
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-600">
                  {group.orders.map((order) => (
                    <div key={order.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                        >
                          Orden {order.orderCode}
                        </Link>
                        {order.deliveredAt && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Entregado: {formatDateTime(order.deliveredAt)}
                          </span>
                        )}
                        <Link
                          href={`/orders/${order.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
                        >
                          Ver PDF
                        </Link>
                      </div>
                      <div className="overflow-x-auto -mx-1">
                      <Table className="min-w-[480px]">
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 dark:bg-slate-700/50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Análisis</TableHead>
                            <TableHead>Sección</TableHead>
                            <TableHead>Resultado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item, idx) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm text-slate-900 dark:text-slate-100">{item.labTest.code}</TableCell>
                              <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.labTest.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {item.labTest.section?.name ?? item.labTest.section?.code ?? ""}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.result && (item.result.items?.length ?? 0) > 0 ? (
                                  <Badge variant="success" className="text-xs">
                                    {item.result.items?.length ?? 0} parámetros
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Sin resultados</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
