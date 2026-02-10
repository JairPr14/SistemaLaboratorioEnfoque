import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildOrderCode } from "@/features/lab/order-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: orderId } = await params;

    const sourceOrder = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: { patient: true, items: { include: { labTest: true } } },
    });

    if (!sourceOrder) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const doctorName = body.doctorName ?? sourceOrder.requestedBy ?? null;
    const indication = body.indication ?? sourceOrder.notes ?? null;
    const patientIdOverride = body.patientId as string | undefined;

    let patientId = sourceOrder.patientId;
    if (patientIdOverride) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientIdOverride, deletedAt: null },
      });
      if (!patient) {
        return NextResponse.json(
          { error: "Paciente no encontrado" },
          { status: 400 }
        );
      }
      patientId = patient.id;
    }

    const items = sourceOrder.items;

    if (!items.length) {
      return NextResponse.json(
        { error: "La orden original no tiene análisis" },
        { status: 400 }
      );
    }

    const totalPrice = items.reduce((acc, i) => acc + Number(i.priceSnapshot), 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.labOrder.count({
      where: { createdAt: { gte: todayStart } },
    });
    const orderCode = buildOrderCode(todayCount + 1);

    const order = await prisma.labOrder.create({
      data: {
        orderCode,
        patientId,
        requestedBy: doctorName,
        notes: indication,
        patientType: sourceOrder.patientType ?? null,
        totalPrice,
        items: {
          createMany: {
            data: items.map((i) => ({
              labTestId: i.labTestId,
              priceSnapshot: i.priceSnapshot,
              templateSnapshot: (i.templateSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
            })),
          },
        },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      code: orderCode,
    });
  } catch (error) {
    console.error("Error repeating order:", error);
    return NextResponse.json(
      { error: "Error al repetir la orden" },
      { status: 500 }
    );
  }
}
