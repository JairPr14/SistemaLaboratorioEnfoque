/**
 * API unificada: devuelve pagos y resumen lab. referido en una sola petición.
 * Reduce 2 llamadas a 1 en OrderPaymentPanel.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { isMissingPaymentTableError } from "@/lib/payments";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.labOrder.findFirst({
    where: { id },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  try {
    const [paymentsResult, referredLabResult] = await Promise.all([
      fetchPayments(id),
      fetchReferredLabSummary(id),
    ]);

    return NextResponse.json({
      payments: paymentsResult.payments,
      referredLabSummary: referredLabResult,
    });
  } catch (error) {
    if (isMissingPaymentTableError(error)) {
      return NextResponse.json(
        { error: "Módulo de pagos pendiente de migración", payments: [], referredLabSummary: null },
        { status: 200 },
      );
    }
    return handleApiError(error, "Error al cargar panel de pagos");
  }
}

async function fetchPayments(orderId: string) {
  try {
    const payments = await prisma.$queryRaw<
      Array<{
        id: string;
        amount: number;
        method: string;
        notes: string | null;
        paidAt: Date;
        createdAt: Date;
        userId: string | null;
        userName: string | null;
        userEmail: string | null;
      }>
    >`
      SELECT p.id, p.amount, p.method::text as method, p.notes, p."paidAt", p."createdAt",
        u.id as "userId", u.name as "userName", u.email as "userEmail"
      FROM "Payment" p
      LEFT JOIN "User" u ON u.id = p."recordedById"
      WHERE p."orderId" = ${orderId}
      ORDER BY p."paidAt" DESC
    `;

    return {
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO",
        notes: p.notes,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        user: p.userId
          ? { id: p.userId, name: p.userName, email: p.userEmail ?? "" }
          : null,
      })),
    };
  } catch (e) {
    if (isMissingPaymentTableError(e)) return { payments: [] };
    throw e;
  }
}

async function fetchReferredLabSummary(orderId: string) {
  const order = await prisma.labOrder.findFirst({
    where: { id: orderId },
    include: {
      items: {
        include: {
          referredLab: { select: { id: true, name: true } },
          labTest: {
            select: {
              isReferred: true,
              externalLabCost: true,
              referredLabId: true,
              referredLab: { select: { id: true, name: true } },
            },
          },
        },
      },
      referredLabPayments: true,
    },
  });

  if (!order) return null;

  const costByLab = new Map<string, { labId: string; labName: string; cost: number }>();
  for (const item of order.items) {
    const lt = item.labTest;
    if (!lt?.isReferred) continue;
    const labId = item.referredLabId ?? lt.referredLabId;
    const lab = item.referredLab ?? lt.referredLab;
    const externalCost = item.externalLabCostSnapshot ?? lt.externalLabCost;
    if (!labId || !lab || !externalCost) continue;
    const existing = costByLab.get(labId);
    if (existing) {
      existing.cost += Number(externalCost);
    } else {
      costByLab.set(labId, { labId, labName: lab.name, cost: Number(externalCost) });
    }
  }

  const totalExternalCost = Array.from(costByLab.values()).reduce((s, l) => s + l.cost, 0);
  if (totalExternalCost <= 0) return null;

  const totalPaidToLabs = order.referredLabPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalBalanceOwed = Math.max(0, totalExternalCost - totalPaidToLabs);

  return {
    totalExternalCost,
    totalPaidToLabs,
    totalBalanceOwed,
  };
}
