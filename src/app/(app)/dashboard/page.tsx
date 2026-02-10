import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { getPendingAlert } from "@/features/lab/pending";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    patientsCount,
    ordersCount,
    pendingCount,
    testsCount,
    revenueTotal,
    revenueThisMonth,
    pendingOrders,
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.labOrder.count(),
    prisma.labOrder.count({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
    }),
    prisma.labTest.count({ where: { deletedAt: null, isActive: true } }),
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      where: { status: { not: "ANULADO" } },
    }),
    prisma.labOrder.aggregate({
      _sum: { totalPrice: true },
      where: { status: { not: "ANULADO" }, createdAt: { gte: startOfMonth } },
    }),
    prisma.labOrder.findMany({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
      include: { patient: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{patientsCount}</div>
            <p className="text-xs text-slate-500 mt-1">registrados activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Órdenes totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{ordersCount}</div>
            <p className="text-xs text-slate-500 mt-1">todas las órdenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pendingCount}</div>
            <p className="text-xs text-slate-500 mt-1">por procesar / capturar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Análisis en catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{testsCount}</div>
            <p className="text-xs text-slate-500 mt-1">activos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(Number(revenueTotal._sum.totalPrice || 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">órdenes no anuladas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(Number(revenueThisMonth._sum.totalPrice || 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">desde {formatDate(startOfMonth)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Órdenes pendientes</CardTitle>
          <Link
            href="/pending"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No hay órdenes pendientes.
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrders.map((order) => {
                  const alert = getPendingAlert(order.status, order.createdAt);
                  const alertVariant =
                    alert === "VENCIDA" ? "danger" : alert === "DEMORADA" ? "warning" : "secondary";
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {order.orderCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {order.patient.firstName} {order.patient.lastName}
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alertVariant}>{alert}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
