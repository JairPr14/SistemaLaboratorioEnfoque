import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const [patients, orders, pendingOrders] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.labOrder.count(),
    prisma.labOrder.findMany({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
      include: { patient: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ]);

  const revenue = await prisma.labOrder.aggregate({
    _sum: { totalPrice: true },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pacientes activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{patients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Órdenes totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ingresos estimados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {formatCurrency(Number(revenue._sum.totalPrice || 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendientes recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderCode}</TableCell>
                  <TableCell>
                    {order.patient.firstName} {order.patient.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
