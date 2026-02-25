import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseDateTimePeru } from "@/lib/date";
import { getServerSession, requirePermission, PERMISSION_REGISTRAR_PAGOS } from "@/lib/auth";
import { orderPaymentSchema } from "@/features/lab/schemas";
import { isMissingPaymentTableError } from "@/lib/payments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.labOrder.findFirst({
    where: { id },
    select: {
      id: true,
      orderCode: true,
      totalPrice: true,
      patient: { select: { firstName: true, lastName: true, dni: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  try {
    const payments = await prisma.$queryRaw<
      Array<{
        id: string;
        amount: number;
        method: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO";
        notes: string | null;
        paidAt: Date;
        createdAt: Date;
        userId: string | null;
        userName: string | null;
        userEmail: string | null;
      }>
    >`
      SELECT
        p.id,
        p.amount,
        p.method::text as method,
        p.notes,
        p."paidAt",
        p."createdAt",
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail"
      FROM "Payment" p
      LEFT JOIN "User" u ON u.id = p."recordedById"
      WHERE p."orderId" = ${id}
      ORDER BY p."paidAt" DESC
    `;

    const paidTotal = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const patient = order.patient;
    const patientLabel = patient
      ? `${patient.lastName} ${patient.firstName}`.trim()
      : "";
    const patientDni = patient?.dni ?? "";
    return NextResponse.json({
      item: {
        ...order,
        patientLabel,
        patientDni,
        payments: payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          notes: p.notes,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
          user: p.userId
            ? { id: p.userId, name: p.userName, email: p.userEmail ?? "" }
            : null,
        })),
      },
      summary: {
        total: Number(order.totalPrice),
        paid: paidTotal,
        balance: Number(order.totalPrice) - paidTotal,
      },
    });
  } catch (error) {
    if (isMissingPaymentTableError(error) && order) {
      const p = order.patient;
      const patientLabel = p ? `${p.lastName} ${p.firstName}`.trim() : "";
      return NextResponse.json({
        item: {
          ...order,
          patientLabel,
          patientDni: p?.dni ?? "",
          payments: [],
        },
        summary: {
          total: Number(order.totalPrice),
          paid: 0,
          balance: Number(order.totalPrice),
        },
      });
    }
    logger.error("Error fetching order payments:", error);
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_REGISTRAR_PAGOS);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = orderPaymentSchema.parse(body);

    const order = await prisma.labOrder.findFirst({
      where: { id },
      select: {
        id: true,
        orderCode: true,
        status: true,
        totalPrice: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.status === "ANULADO") {
      return NextResponse.json({ error: "No se puede registrar pago en una orden anulada" }, { status: 400 });
    }

    const paidResult = await prisma.$queryRaw<Array<{ paid: number | null }>>`
      SELECT COALESCE(SUM("amount"), 0) as paid
      FROM "Payment"
      WHERE "orderId" = ${order.id}
    `;
    const paidTotal = Number(paidResult[0]?.paid ?? 0);
    const balance = Number(order.totalPrice) - paidTotal;
    if (parsed.amount > balance + 0.0001) {
      return NextResponse.json(
        { error: `El monto excede el saldo pendiente (${balance.toFixed(2)})` },
        { status: 400 },
      );
    }

    const paymentId = randomUUID();
    const paidAt = parsed.paidAt ? parseDateTimePeru(parsed.paidAt) : new Date();
    await prisma.$executeRaw`
      INSERT INTO "Payment" ("id", "orderId", "amount", "method", "notes", "paidAt", "recordedById", "createdAt", "updatedAt")
      VALUES (
        ${paymentId},
        ${order.id},
        ${parsed.amount},
        CAST(${parsed.method} AS "PaymentMethod"),
        ${parsed.notes ?? null},
        ${paidAt},
        ${auth.session.user.id},
        NOW(),
        NOW()
      )
    `;

    const newPaidTotal = paidTotal + Number(parsed.amount);
    const newBalance = Number(order.totalPrice) - newPaidTotal;

    logger.info("Order payment registered", {
      orderId: order.id,
      orderCode: order.orderCode,
      paymentId,
      amount: parsed.amount,
      method: parsed.method,
      byUserId: auth.session.user.id,
    });

    return NextResponse.json({
      item: {
        id: paymentId,
        orderId: order.id,
        amount: parsed.amount,
        method: parsed.method,
        notes: parsed.notes ?? null,
        paidAt,
      },
      summary: {
        total: Number(order.totalPrice),
        paid: newPaidTotal,
        balance: newBalance,
      },
    });
  } catch (error) {
    if (isMissingPaymentTableError(error)) {
      return NextResponse.json(
        { error: "Módulo de pagos pendiente de migración. Ejecuta prisma migrate deploy." },
        { status: 503 },
      );
    }
    logger.error("Error registering order payment:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 });
  }
}
