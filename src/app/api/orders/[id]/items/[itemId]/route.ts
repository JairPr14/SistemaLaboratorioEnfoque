import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSION_ELIMINAR_REGISTROS } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; itemId: string }> };

/**
 * DELETE: elimina un análisis (ítem) de la orden.
 * Borra resultado e ítems de resultado si existen, luego el ítem y actualiza el total de la orden.
 * Solo administradores.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_ELIMINAR_REGISTROS);
  if (auth.response) return auth.response;
  try {
    const { id: orderId, itemId } = await params;

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId },
      include: { result: true, order: true },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "Análisis no encontrado en esta orden" },
        { status: 404 },
      );
    }

    const priceToSubtract = Number(orderItem.priceSnapshot);

    await prisma.$transaction(async (tx) => {
      if (orderItem.result) {
        await tx.labResultItem.deleteMany({
          where: { resultId: orderItem.result.id },
        });
        await tx.labResult.delete({
          where: { id: orderItem.result.id },
        });
      }
      await tx.labOrderItem.delete({
        where: { id: itemId },
      });
      const newTotal = Math.max(
        0,
        Number(orderItem.order.totalPrice) - priceToSubtract,
      );
      await tx.labOrder.update({
        where: { id: orderId },
        data: { totalPrice: newTotal },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting order item:", error);
    return NextResponse.json(
      { error: "Error al eliminar el análisis de la orden" },
      { status: 500 },
    );
  }
}
