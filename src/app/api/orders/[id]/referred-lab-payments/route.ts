import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseDateTimePeru } from "@/lib/date";
import { getServerSession, requirePermission, PERMISSION_REGISTRAR_PAGOS } from "@/lib/auth";
import { referredLabPaymentSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string }> };

/** Obtiene el costo referido de la orden (por lab) y los pagos ya realizados */
export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: {
      items: {
        include: {
          referredLab: {
            select: { id: true, name: true },
          },
          labTest: {
            select: {
              id: true,
              name: true,
              code: true,
              isReferred: true,
              externalLabCost: true,
              referredLabId: true,
              referredLab: { select: { id: true, name: true } },
            },
          },
        },
      },
      referredLabPayments: {
        include: {
          referredLab: { select: { id: true, name: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  // Agrupar costo externo por laboratorio referido
  const costByLab = new Map<string, { labId: string; labName: string; cost: number }>();
  for (const item of order.items) {
    const lt = item.labTest;
    if (!lt.isReferred) continue;
    const labId = item.referredLabId ?? lt.referredLabId;
    const lab =
      item.referredLab ??
      lt.referredLab;
    const externalCost = item.externalLabCostSnapshot ?? lt.externalLabCost;
    if (!labId || !lab || !externalCost) continue;
    if (!lab) continue;
    const existing = costByLab.get(labId);
    if (existing) {
      existing.cost += Number(externalCost);
    } else {
      costByLab.set(labId, {
        labId,
        labName: lab.name,
        cost: Number(externalCost),
      });
    }
  }

  const labs = Array.from(costByLab.values());
  const totalExternalCost = labs.reduce((s, l) => s + l.cost, 0);

  const paidByLab = new Map<string, number>();
  for (const p of order.referredLabPayments) {
    const current = paidByLab.get(p.referredLabId) ?? 0;
    paidByLab.set(p.referredLabId, current + Number(p.amount));
  }

  const labSummaries = labs.map((l) => ({
    referredLabId: l.labId,
    referredLabName: l.labName,
    totalCost: l.cost,
    paid: paidByLab.get(l.labId) ?? 0,
    balance: Math.max(0, l.cost - (paidByLab.get(l.labId) ?? 0)),
  }));

  const totalPaidToLabs = order.referredLabPayments.reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const totalBalanceOwed = Math.max(0, totalExternalCost - totalPaidToLabs);

  return NextResponse.json({
    orderId: order.id,
    totalExternalCost,
    totalPaidToLabs,
    totalBalanceOwed,
    labs: labSummaries,
    payments: order.referredLabPayments.map((p) => ({
      id: p.id,
      referredLabId: p.referredLabId,
      referredLabName: p.referredLab.name,
      amount: Number(p.amount),
      paidAt: p.paidAt,
      notes: p.notes,
      user: p.user
        ? { name: p.user.name, email: p.user.email }
        : null,
    })),
  });
}

/** Registra un pago al laboratorio referido */
export async function POST(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_REGISTRAR_PAGOS);
  if (auth.response) return auth.response;

  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const parsed = referredLabPaymentSchema.parse(body);

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: {
        items: {
          include: {
            referredLab: {
              select: { id: true, name: true },
            },
            labTest: {
              select: {
                isReferred: true,
                externalLabCost: true,
                referredLabId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const costForLab = order.items
      .filter((i) => {
        if (!i.labTest.isReferred) return false;
        const effectiveLabId = i.referredLabId ?? i.labTest.referredLabId;
        const effectiveCost = i.externalLabCostSnapshot ?? i.labTest.externalLabCost;
        return effectiveLabId === parsed.referredLabId && !!effectiveCost;
      })
      .reduce(
        (s, i) =>
          s +
          Number(i.externalLabCostSnapshot ?? i.labTest.externalLabCost ?? 0),
        0,
      );

    if (costForLab <= 0) {
      return NextResponse.json(
        { error: "Esta orden no tiene análisis referidos de ese laboratorio" },
        { status: 400 },
      );
    }

    const existingPayments = await prisma.referredLabPayment.aggregate({
      where: {
        orderId,
        referredLabId: parsed.referredLabId,
      },
      _sum: { amount: true },
    });

    const paidSoFar = Number(existingPayments._sum.amount ?? 0);
    const balanceOwed = Math.max(0, costForLab - paidSoFar);

    if (parsed.amount > balanceOwed + 0.0001) {
      return NextResponse.json(
        {
          error: `El monto excede lo pendiente por pagar a este laboratorio (${balanceOwed.toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    const paymentId = randomUUID();
    const paidAt = parsed.paidAt ? parseDateTimePeru(parsed.paidAt) : new Date();

    await prisma.referredLabPayment.create({
      data: {
        id: paymentId,
        orderId,
        referredLabId: parsed.referredLabId,
        amount: parsed.amount,
        paidAt,
        notes: parsed.notes?.trim() || null,
        recordedById: auth.session.user.id,
      },
    });

    const referredLab = await prisma.referredLab.findUnique({
      where: { id: parsed.referredLabId },
      select: { name: true },
    });

    logger.info("Referred lab payment registered", {
      orderId,
      referredLabId: parsed.referredLabId,
      amount: parsed.amount,
      byUserId: auth.session.user.id,
    });

    return NextResponse.json({
      item: {
        id: paymentId,
        orderId,
        referredLabId: parsed.referredLabId,
        referredLabName: referredLab?.name ?? "",
        amount: parsed.amount,
        paidAt,
        notes: parsed.notes ?? null,
      },
      summary: {
        totalCost: costForLab,
        paid: paidSoFar + parsed.amount,
        balance: Math.max(0, balanceOwed - parsed.amount),
      },
    });
  } catch (error) {
    logger.error("Error registering referred lab payment:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al registrar pago al laboratorio referido" },
      { status: 500 },
    );
  }
}
