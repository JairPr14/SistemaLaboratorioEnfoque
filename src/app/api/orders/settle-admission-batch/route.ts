import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerSession, hasPermission, PERMISSION_COBRO_ADMISION, PERMISSION_REGISTRAR_PAGOS } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const bodySchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1, "Se requieren órdenes para cobrar"),
});

/** Cobra todas las órdenes del lote a admisión (marca admissionSettledAt) */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canSettle =
    hasPermission(session, PERMISSION_COBRO_ADMISION) ||
    hasPermission(session, PERMISSION_REGISTRAR_PAGOS);
  if (!canSettle) {
    return NextResponse.json({ error: "Sin permiso para cobrar a admisión" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { orderIds } = bodySchema.parse(body);

    const now = new Date();
    const result = await prisma.labOrder.updateMany({
      where: {
        id: { in: orderIds },
        orderSource: "ADMISION",
        admissionSettledAt: null,
        status: { not: "ANULADO" },
      },
      data: { admissionSettledAt: now },
    });

    logger.info("Batch admission settle", {
      orderIds,
      count: result.count,
      byUserId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      settledCount: result.count,
    });
  } catch (error) {
    logger.error("Error settling admission batch:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al cobrar a admisión" },
      { status: 500 }
    );
  }
}
