import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildOrderCode,
  getNextOrderSequence,
} from "@/features/lab/order-utils";

import { logger } from "@/lib/logger";
import { getServerSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

    async function createWithNextCode(
      orderSource: NonNullable<typeof sourceOrder>,
    ): Promise<{ orderCode: string; orderId: string }> {
      const existing = await prisma.labOrder.findMany({
        select: { orderCode: true },
      });
      const nextSeq = getNextOrderSequence(existing);
      const orderCode = buildOrderCode(nextSeq);

      const order = await prisma.labOrder.create({
        data: {
          orderCode,
          patientId,
          requestedBy: doctorName,
          notes: indication,
          patientType: orderSource.patientType ?? null,
          totalPrice,
          items: {
            createMany: {
              data: items.map((i) => ({
                labTestId: i.labTestId,
                priceSnapshot: i.priceSnapshot,
                templateSnapshot: i.templateSnapshot ?? undefined,
              })),
            },
          },
        },
      });
      return { orderCode, orderId: order.id };
    }

    let result: { orderCode: string; orderId: string };
    try {
      result = await createWithNextCode(sourceOrder);
    } catch (err: unknown) {
      const isUniqueViolation =
        err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
      if (isUniqueViolation) {
        result = await createWithNextCode(sourceOrder);
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      orderId: result.orderId,
      code: result.orderCode,
    });
  } catch (error) {
    logger.error("Error repeating order:", error);
    return NextResponse.json(
      { error: "Error al repetir la orden" },
      { status: 500 }
    );
  }
}
