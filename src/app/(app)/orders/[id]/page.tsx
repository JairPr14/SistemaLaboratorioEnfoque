import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, hasPermission, PERMISSION_ELIMINAR_REGISTROS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";
import { OrderItemsTableWithPrint } from "@/components/orders/OrderItemsTableWithPrint";
import { RepeatOrderButton } from "@/components/orders/RepeatOrderButton";
import { EditOrderButton } from "@/components/orders/EditOrderButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ captureItem?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { captureItem } = await searchParams;
  const session = await getServerSession(authOptions);
  const canDeleteOrderItems = hasPermission(session, PERMISSION_ELIMINAR_REGISTROS);
  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: {
      patient: true,
      items: {
        include: {
          labTest: {
            include: {
              section: true,
              template: { 
                include: { 
                  items: {
                    include: {
                      refRanges: true
                    }
                  }
                } 
              } 
            } 
          },
          result: { include: { items: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Orden {order.orderCode}</CardTitle>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cambiar estado de la orden
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EditOrderButton
              orderId={order.id}
              patientType={order.patientType}
              requestedBy={order.requestedBy}
              notes={order.notes}
              disabled={order.status === "ANULADO"}
            />
            <RepeatOrderButton
              orderId={order.id}
              patientName={`${order.patient.firstName} ${order.patient.lastName}`}
            />
            <OrderStatusActions orderId={order.id} currentStatus={order.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Paciente</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {order.patient.firstName} {order.patient.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fecha</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Estado</p>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Solicitante</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {order.requestedBy || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(Number(order.totalPrice))}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tipo de paciente (sede)</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {order.patientType === "CLINICA"
                  ? "Paciente Clínica"
                  : order.patientType === "EXTERNO"
                    ? "Paciente Externo"
                    : order.patientType === "IZAGA"
                      ? "Paciente Izaga"
                      : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderItemsTableWithPrint
        order={order}
        defaultOpenItemId={captureItem ?? undefined}
        canDeleteItems={canDeleteOrderItems}
      />
    </div>
  );
}
