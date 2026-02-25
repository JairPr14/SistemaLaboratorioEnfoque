import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  authOptions,
  hasAnyPermission,
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_ELIMINAR_REGISTROS,
  PERMISSION_GESTIONAR_ADMISION,
  PERMISSION_IMPRIMIR_TICKET_PAGO,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_REGISTRAR_PAGOS,
  PERMISSION_VER_ADMISION,
  PERMISSION_VER_ORDENES,
  PERMISSION_VER_PAGOS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatPatientDisplayName } from "@/lib/format";
import { getPaidTotalByOrderId } from "@/lib/payments";
import { calculateConventionTotal } from "@/lib/order-pricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";
import { OrderItemsTableWithPrint } from "@/components/orders/OrderItemsTableWithPrint";
import { RepeatOrderButton } from "@/components/orders/RepeatOrderButton";
import { EditOrderButton } from "@/components/orders/EditOrderButton";
import { PreAnalyticNotePicker } from "@/components/orders/PreAnalyticNotePicker";
import { OrderPaymentPanel } from "@/components/orders/OrderPaymentPanel";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ captureItem?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { captureItem } = await searchParams;
  const session = await getServerSession(authOptions);
  const canAccessOrder = hasAnyPermission(session, [
    PERMISSION_VER_ORDENES,
    PERMISSION_QUICK_ACTIONS_RECEPCION,
    PERMISSION_QUICK_ACTIONS_ANALISTA,
    PERMISSION_QUICK_ACTIONS_ENTREGA,
    PERMISSION_GESTIONAR_ADMISION,
    PERMISSION_VER_ADMISION,
  ]);
  if (!session?.user || !canAccessOrder) {
    redirect("/dashboard");
  }
  const canDeleteOrderItems = hasPermission(session, PERMISSION_ELIMINAR_REGISTROS);
  const canEditPreAnalytic = hasPermission(session, PERMISSION_CAPTURAR_RESULTADOS);
  const canRegisterPayment = hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  const canPrintTicket =
    hasPermission(session, PERMISSION_IMPRIMIR_TICKET_PAGO) ||
    hasPermission(session, PERMISSION_VER_PAGOS) ||
    hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          labTest: {
            include: {
              section: true,
              referredLabOptions: {
                include: {
                  referredLab: true,
                },
              },
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

  const paidTotal = await getPaidTotalByOrderId(prisma, order.id);
  const balance = Math.max(0, Number(order.totalPrice) - paidTotal);
  const paymentStatus =
    paidTotal <= 0 ? "PENDIENTE" : paidTotal + 0.0001 < Number(order.totalPrice) ? "PARCIAL" : "PAGADO";

  const isFromAdmission = !!order.admissionRequestId;
  const conventionTotal = isFromAdmission
    ? calculateConventionTotal(order.items)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Orden {order.orderCode}</CardTitle>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cambiar estado de la orden
            </p>
            <div className="mt-2">
              <Badge
                variant={
                  paymentStatus === "PAGADO"
                    ? "success"
                    : paymentStatus === "PARCIAL"
                      ? "warning"
                      : "secondary"
                }
              >
                Cobro {paymentStatus}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PreAnalyticNotePicker
              orderId={order.id}
              initialValue={order.preAnalyticNote ?? null}
              canEdit={canEditPreAnalytic}
            />
            <EditOrderButton
              orderId={order.id}
              patientType={order.patientType}
              branchId={order.branchId}
              requestedBy={order.requestedBy}
              notes={order.notes}
              disabled={order.status === "ANULADO"}
            />
            <RepeatOrderButton
              orderId={order.id}
              patientName={formatPatientDisplayName(order.patient.firstName, order.patient.lastName)}
            />
            <OrderStatusActions orderId={order.id} currentStatus={order.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Paciente</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatPatientDisplayName(order.patient.firstName, order.patient.lastName)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">DNI</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {order.patient.dni ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fecha</p>
<p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {order.requestedBy || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isFromAdmission ? "Total orden (público)" : "Total"}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(Number(order.totalPrice))}
              </p>
              {isFromAdmission && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Lo que cobró admisión al paciente
                </p>
              )}
            </div>
            {isFromAdmission && conventionTotal != null && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">A cobrar a admisión (convenio)</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(conventionTotal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Lo que el laboratorio cobra a admisión
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sede de atención</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {order.branch?.name ?? (
                  order.patientType === "CLINICA"
                    ? "Paciente Clínica"
                    : order.patientType === "EXTERNO"
                      ? "Paciente Externo"
                      : order.patientType === "IZAGA"
                        ? "Paciente Izaga"
                        : "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Cobrado</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(paidTotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Saldo pendiente</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(balance)}
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
      <OrderPaymentPanel
        orderId={order.id}
        orderCode={order.orderCode}
        orderTotal={Number(order.totalPrice)}
        conventionTotal={conventionTotal}
        canRegisterPayment={canRegisterPayment}
        canPrintTicket={canPrintTicket}
      />
    </div>
  );
}
