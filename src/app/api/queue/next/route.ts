import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getServerSession,
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_VALIDAR_RESULTADOS,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

type QueueType = "capture" | "validate";

function isUrgentOrder(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.toUpperCase().includes("[URGENTE]");
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") ?? "capture") as QueueType;
    const section = searchParams.get("section")?.trim() || null;
    const onlyToday = searchParams.get("today") === "1";

    if (type !== "capture" && type !== "validate") {
      return NextResponse.json({ error: "Tipo de cola inválido" }, { status: 400 });
    }

    if (type === "capture" && !hasPermission(session, PERMISSION_CAPTURAR_RESULTADOS)) {
      return NextResponse.json({ error: "Sin permiso para capturar resultados" }, { status: 403 });
    }
    if (type === "validate" && !hasPermission(session, PERMISSION_VALIDAR_RESULTADOS)) {
      return NextResponse.json({ error: "Sin permiso para validar resultados" }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseWhere = {
      ...(onlyToday ? { createdAt: { gte: todayStart } } : {}),
      ...(section
        ? {
            items: {
              some: { labTest: { section: { code: section.toUpperCase() } } },
            },
          }
        : {}),
    };

    const candidates = await prisma.labOrder.findMany({
      where:
        type === "capture"
          ? {
              ...baseWhere,
              status: { in: ["PENDIENTE", "EN_PROCESO"] },
            }
          : {
              ...baseWhere,
              status: { in: ["EN_PROCESO", "COMPLETADO"] },
            },
      include: {
        items: {
          include: {
            result: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    if (type === "capture") {
      const rows = candidates
        .map((order) => {
          const nextItem = order.items.find((item) => item.status !== "COMPLETADO");
          if (!nextItem) return null;
          return {
            orderId: order.id,
            orderCode: order.orderCode,
            nextItemId: nextItem.id,
            createdAt: order.createdAt,
            urgent: isUrgentOrder(order.notes),
          };
        })
        .filter(Boolean) as Array<{
        orderId: string;
        orderCode: string;
        nextItemId: string;
        createdAt: Date;
        urgent: boolean;
      }>;

      rows.sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const next = rows[0];
      if (!next) return NextResponse.json({ item: null });
      return NextResponse.json({
        item: {
          orderId: next.orderId,
          orderCode: next.orderCode,
          itemId: next.nextItemId,
          mode: "capture",
        },
      });
    }

    const validateRows = candidates
      .map((order) => {
        const total = order.items.length;
        const completed = order.items.filter((item) => item.status === "COMPLETADO").length;
        const hasDrafts = order.items.some((item) => item.result?.isDraft === true);
        if (total === 0 || completed !== total || !hasDrafts) return null;
        return {
          orderId: order.id,
          orderCode: order.orderCode,
          createdAt: order.createdAt,
          urgent: isUrgentOrder(order.notes),
        };
      })
      .filter(Boolean) as Array<{
      orderId: string;
      orderCode: string;
      createdAt: Date;
      urgent: boolean;
    }>;

    validateRows.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const nextValidate = validateRows[0];
    if (!nextValidate) return NextResponse.json({ item: null });
    return NextResponse.json({
      item: {
        orderId: nextValidate.orderId,
        orderCode: nextValidate.orderCode,
        mode: "validate",
      },
    });
  } catch (error) {
    logger.error("Error obtaining next queue item:", error);
    return NextResponse.json(
      { error: "Error al obtener siguiente elemento de cola" },
      { status: 500 },
    );
  }
}
