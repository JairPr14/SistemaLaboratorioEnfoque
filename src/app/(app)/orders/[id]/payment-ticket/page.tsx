import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions, hasPermission, PERMISSION_IMPRIMIR_TICKET_PAGO, PERMISSION_REGISTRAR_PAGOS, PERMISSION_VER_PAGOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPatientDisplayName } from "@/lib/format";
import { getPaidTotalByOrderId } from "@/lib/payments";
import { PaymentTicketClient } from "@/components/pagos/PaymentTicketClient";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentTicketPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canPrintTicket =
    hasPermission(session, PERMISSION_IMPRIMIR_TICKET_PAGO) ||
    hasPermission(session, PERMISSION_VER_PAGOS) ||
    hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  if (!canPrintTicket) redirect("/dashboard");

  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: { patient: true },
  });

  if (!order) notFound();

  const paidTotal = await getPaidTotalByOrderId(prisma, order.id);
  const total = Number(order.totalPrice);
  const balance = Math.max(0, total - paidTotal);
  const paymentStatus =
    paidTotal <= 0 ? "PENDIENTE" : paidTotal + 0.0001 < total ? "PARCIAL" : "PAGADO";

  let payments: Array<{ amount: number; method: string; paidAt: Date }> = [];
  try {
    const rows = await prisma.$queryRaw<
      Array<{ amount: number; method: string; paidAt: Date }>
    >`
      SELECT amount, method::text as method, "paidAt"
      FROM "Payment"
      WHERE "orderId" = ${id}
      ORDER BY "paidAt" DESC
    `;
    payments = rows;
  } catch {
    // Tabla Payment puede no existir
  }

  const patientName = formatPatientDisplayName(order.patient.firstName, order.patient.lastName);

  return (
    <PaymentTicketClient
      orderCode={order.orderCode}
      patientName={patientName}
      patientDni={order.patient.dni ?? null}
      createdAt={order.createdAt}
      total={total}
      paidTotal={paidTotal}
      balance={balance}
      paymentStatus={paymentStatus}
      payments={payments}
    />
  );
}
