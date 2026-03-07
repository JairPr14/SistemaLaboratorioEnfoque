import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseDateTimePeru } from "@/lib/date";
import { orderUpdateSchema } from "@/features/lab/schemas";
import {
  requirePermission,
  requireAnyPermission,
  PERMISSION_ELIMINAR_REGISTROS,
  PERMISSION_VER_ORDENES,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  hasPermission,
} from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAnyPermission([
    PERMISSION_VER_ORDENES,
    PERMISSION_QUICK_ACTIONS_RECEPCION,
    PERMISSION_QUICK_ACTIONS_ANALISTA,
    PERMISSION_QUICK_ACTIONS_ENTREGA,
  ]);
  if (auth.response) return auth.response;

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
    return handleApiError(error, "Error al obtener orden");
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAnyPermission([
    PERMISSION_VER_ORDENES,
    PERMISSION_QUICK_ACTIONS_RECEPCION,
    PERMISSION_QUICK_ACTIONS_ANALISTA,
    PERMISSION_QUICK_ACTIONS_ENTREGA,
  ]);
  if (auth.response) return auth.response;
  const session = auth.session;

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = orderUpdateSchema.parse(payload);

    // Anular orden requiere permiso ELIMINAR_REGISTROS
    if (parsed.status === "ANULADO") {
      if (!hasPermission(session, PERMISSION_ELIMINAR_REGISTROS)) {
        return NextResponse.json(
          { error: "Sin permiso para anular órdenes" },
          { status: 403 },
        );
      }
    }

    let updateData: Parameters<typeof prisma.labOrder.update>[0]["data"] = {
      status: parsed.status,
      notes: parsed.notes !== undefined ? parsed.notes : undefined,
      preAnalyticNote:
        parsed.preAnalyticNote !== undefined ? parsed.preAnalyticNote : undefined,
      requestedBy: parsed.requestedBy !== undefined ? parsed.requestedBy : undefined,
      patientType: parsed.patientType !== undefined ? parsed.patientType : undefined,
      branchId: parsed.branchId !== undefined ? parsed.branchId : undefined,
      deliveredAt:
        parsed.deliveredAt !== undefined
          ? parsed.deliveredAt
            ? parseDateTimePeru(parsed.deliveredAt)
            : null
          : parsed.status === "ENTREGADO"
            ? new Date()
            : undefined,
    };

    const item = await prisma.labOrder.update({
      where: { id },
      data: updateData,
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
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return handleApiError(error, "Error al actualizar orden");
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
      for (const item of order.items) {
        if (item.result) {
          await tx.labResultItem.deleteMany({ where: { resultId: item.result.id } });
          await tx.labResult.delete({ where: { id: item.result.id } });
        }
      }
      await tx.labOrderItem.deleteMany({ where: { orderId: id } });
      await tx.labOrder.delete({ where: { id } });
    });
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Error al eliminar la orden");
  }
}
