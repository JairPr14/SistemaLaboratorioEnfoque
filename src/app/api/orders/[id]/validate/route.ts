import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSION_VALIDAR_RESULTADOS } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_VALIDAR_RESULTADOS);
  if (auth.response) return auth.response;
  const session = auth.session;

  try {
    const { id: orderId } = await params;

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: { items: { include: { result: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.result) {
          await tx.labResult.update({
            where: { id: item.result.id },
            data: { isDraft: false, validatedById: session.user.id, validatedAt: now },
          });
        }
      }
      await tx.labOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETADO" },
      });
    });

    logger.info("Order validated", {
      orderId,
      byUserId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Error al validar la orden");
  }
}
