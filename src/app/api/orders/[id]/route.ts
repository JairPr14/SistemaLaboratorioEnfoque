import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderUpdateSchema } from "@/features/lab/schemas";
import { requirePermission, PERMISSION_ELIMINAR_REGISTROS, getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await prisma.labOrder.findFirst({
      where: { id },
      include: {
        patient: true,
        items: {
          include: {
            labTest: { include: { template: { include: { items: true } } } },
            result: { include: { items: { orderBy: { order: "asc" } } } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Error al obtener orden" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = orderUpdateSchema.parse(payload);

    const item = await prisma.labOrder.update({
      where: { id },
      data: {
        status: parsed.status,
        notes: parsed.notes !== undefined ? parsed.notes : undefined,
        preAnalyticNote:
          parsed.preAnalyticNote !== undefined ? parsed.preAnalyticNote : undefined,
        requestedBy: parsed.requestedBy !== undefined ? parsed.requestedBy : undefined,
        patientType: parsed.patientType !== undefined ? parsed.patientType : undefined,
        deliveredAt:
          parsed.deliveredAt !== undefined
            ? parsed.deliveredAt
              ? new Date(parsed.deliveredAt)
              : null
            : parsed.status === "ENTREGADO"
              ? new Date()
              : undefined,
      },
    });

    if (parsed.preAnalyticNote !== undefined) {
      logger.info("Pre-analytic note updated", {
        orderId: id,
        byUserId: session.user.id,
      });
    }
    if (parsed.status === "ENTREGADO") {
      logger.info("Order marked as delivered", {
        orderId: id,
        byUserId: session.user.id,
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_ELIMINAR_REGISTROS);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;

    const order = await prisma.labOrder.findFirst({
      where: { id },
      include: { items: { include: { result: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (order.admissionRequestId) {
        await tx.admissionRequest.update({
          where: { id: order.admissionRequestId },
          data: {
            status: "PENDIENTE",
            convertedOrderId: null,
            convertedAt: null,
          },
        });
      }
      for (const item of order.items) {
        if (item.result) {
          await tx.labResultItem.deleteMany({ where: { resultId: item.result.id } });
          await tx.labResult.delete({ where: { id: item.result.id } });
        }
      }
      await tx.labOrderItem.deleteMany({ where: { orderId: id } });
      await tx.labOrder.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting order:", error);
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al eliminar la orden" },
      { status: 500 },
    );
  }
}
