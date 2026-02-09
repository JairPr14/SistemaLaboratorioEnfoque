import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getPendingAlert } from "@/features/lab/pending";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export default async function PendingPage() {
  const orders = await prisma.labOrder.findMany({
    where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
    include: { patient: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendientes y alertas</CardTitle>
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
            {orders.map((order) => {
              const alert = getPendingAlert(order.status, order.createdAt);
              const variant =
                alert === "VENCIDA"
                  ? "danger"
                  : alert === "DEMORADA"
                    ? "warning"
                    : "secondary";

              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link className="hover:underline" href={`/orders/${order.id}`}>
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
                    <Badge variant={variant}>{alert}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
