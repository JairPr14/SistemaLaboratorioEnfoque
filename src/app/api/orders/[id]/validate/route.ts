import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error validating order:", error);
    return NextResponse.json(
      { error: "Error al validar la orden" },
      { status: 500 }
    );
  }
}
