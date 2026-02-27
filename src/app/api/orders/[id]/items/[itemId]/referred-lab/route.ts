import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { getServerSession, hasPermission, PERMISSION_CAPTURAR_RESULTADOS, PERMISSION_VER_ORDENES } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canEdit =
    hasPermission(session, PERMISSION_CAPTURAR_RESULTADOS) ||
    hasPermission(session, PERMISSION_VER_ORDENES);
  if (!canEdit) {
    return NextResponse.json({ error: "Sin permiso para actualizar laboratorio referido" }, { status: 403 });
  }

  try {
    const { id: orderId, itemId } = await params;
    const body = await request.json().catch(() => ({}));
    const referredLabId: string | null =
      typeof body?.referredLabId === "string" && body.referredLabId.trim() !== ""
        ? body.referredLabId.trim()
        : null;

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        labTest: {
          include: {
            referredLabOptions: {
              include: { referredLab: true },
            },
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Análisis no encontrado en esta orden" }, { status: 404 });
    }

    // Si el test no es referido, no tiene sentido asignar lab
    if (!orderItem.labTest.isReferred) {
      return NextResponse.json({ error: "Este análisis no está configurado como referido" }, { status: 400 });
    }

    const options = orderItem.labTest.referredLabOptions ?? [];
    let selectedOption: (typeof options)[number] | null = null;

    if (referredLabId) {
      selectedOption = options.find((opt) => opt.referredLabId === referredLabId) ?? null;
      if (!selectedOption) {
        return NextResponse.json({ error: "Laboratorio referido no válido para este análisis" }, { status: 400 });
      }
    } else if (options.length > 0) {
      selectedOption = options.find((opt) => opt.isDefault) ?? options[0];
    }

    await prisma.labOrderItem.update({
      where: { id: itemId },
      data: {
        referredLabId: selectedOption?.referredLabId ?? null,
        externalLabCostSnapshot:
          selectedOption?.externalLabCost ??
          orderItem.labTest.externalLabCost ??
          null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error updating referred lab for order item:", error);
    return NextResponse.json(
      { error: "Error al actualizar laboratorio referido del análisis" },
      { status: 500 },
    );
  }
}

