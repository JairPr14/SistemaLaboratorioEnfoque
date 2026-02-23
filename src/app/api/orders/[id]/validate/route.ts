import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: { items: { include: { result: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.result) {
          await tx.labResult.update({
            where: { id: item.result.id },
            data: { isDraft: false },
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
    logger.error("Error validating order:", error);
    return NextResponse.json(
      { error: "Error al validar la orden" },
      { status: 500 }
    );
  }
}
