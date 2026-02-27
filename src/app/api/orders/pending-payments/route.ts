import { NextResponse } from "next/server";


import { getServerSession, hasPermission, PERMISSION_REGISTRAR_PAGOS, PERMISSION_VER_PAGOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";

const MAX_PENDING = 50;

/** Devuelve órdenes con cobro pendiente o parcial (excluye ya pagadas) */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canAccess = hasPermission(session, PERMISSION_VER_PAGOS) || hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  if (!canAccess) {
    return NextResponse.json({ error: "Sin permiso para acceder a pagos pendientes" }, { status: 403 });
  }

  const orders = await prisma.labOrder.findMany({
    where: { status: { not: "ANULADO" } },
    select: {
      id: true,
      orderCode: true,
      totalPrice: true,
      patient: { select: { firstName: true, lastName: true, dni: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_PENDING * 2, // traer más para filtrar por pago
  });

  const orderIds = orders.map((o) => o.id);
  const paidByOrder = await getPaidTotalsByOrderIds(prisma, orderIds);

  const pending: Array<{
    id: string;
    label: string;
    sublabel: string;
    total: number;
    paid: number;
    balance: number;
  }> = [];

  for (const order of orders) {
    const paid = paidByOrder.get(order.id) ?? 0;
    const total = Number(order.totalPrice);
    const balance = Math.max(0, total - paid);
    if (balance <= 0) continue; // ya pagada, excluir
    const patient = order.patient;
    const patientLabel = patient
      ? `${patient.lastName} ${patient.firstName}`.trim()
      : "";
    const patientDni = patient?.dni ?? "";
    pending.push({
      id: order.id,
      label: order.orderCode,
      sublabel: patientDni ? `${patientLabel} — ${patientDni}` : patientLabel,
      total,
      paid,
      balance,
    });
    if (pending.length >= MAX_PENDING) break;
  }

  return NextResponse.json({ orders: pending });
}
