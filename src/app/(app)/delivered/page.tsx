import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function DeliveredPage() {
  const orders = await prisma.labOrder.findMany({
    where: { status: "ENTREGADO" },
    include: {
      patient: true,
      items: {
        include: {
          labTest: true,
          result: { include: { items: true } },
        },
      },
    },
    orderBy: [{ deliveredAt: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis entregados</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Órdenes con estado ENTREGADO, ordenadas por fecha y hora de entrega (más recientes primero).
        </p>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p>No hay órdenes entregadas registradas.</p>
            <p className="text-sm mt-2">
              Las órdenes marcadas como &quot;Entregado&quot; aparecerán aquí.
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline"
            >
              Ir a Órdenes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {order.orderCode}
                    </Link>
                    <span className="text-sm text-slate-600">
                      {order.patient.lastName} {order.patient.firstName}
                    </span>
                    <span className="text-xs text-slate-500">DNI {order.patient.dni}</span>
                    {order.deliveredAt && (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-700 text-xs">
                        Entregado: {formatDateTime(order.deliveredAt)}
                      </Badge>
                    )}
                  </div>
                  <Link
                    href={`/orders/${order.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Ver PDF
                  </Link>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
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
                        <TableCell className="text-slate-500 text-sm">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{item.labTest.code}</TableCell>
                        <TableCell className="font-medium">{item.labTest.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.labTest.section}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.result && (item.result.items?.length ?? 0) > 0 ? (
                            <Badge variant="success" className="bg-emerald-100 text-emerald-700 text-xs">
                              {item.result.items?.length ?? 0} parámetros
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Sin resultados</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
