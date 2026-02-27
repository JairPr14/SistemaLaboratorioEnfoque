import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; itemId: string }> };

const templateSnapshotItemSchema = {
  id: (v: unknown) => typeof v === "string" && v.length > 0,
  groupName: (v: unknown) => v == null || typeof v === "string",
  paramName: (v: unknown) => typeof v === "string",
  unit: (v: unknown) => v == null || typeof v === "string",
  refRangeText: (v: unknown) => v == null || typeof v === "string",
  refMin: (v: unknown) => v == null || typeof v === "number",
  refMax: (v: unknown) => v == null || typeof v === "number",
  valueType: (v: unknown) =>
    ["NUMBER", "DECIMAL", "PERCENTAGE", "TEXT", "SELECT"].includes(String(v)),
  selectOptions: (v: unknown) =>
    Array.isArray(v) || (typeof v === "string" && (v === "[]" || v.startsWith("["))),
  order: (v: unknown) => typeof v === "number" && v >= 0,
};

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: orderId, itemId } = await params;
    const body = await request.json().catch(() => ({}));

    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Se requieren ítems para la plantilla" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !templateSnapshotItemSchema.id(item?.id) ||
        !templateSnapshotItemSchema.paramName(item?.paramName) ||
        !templateSnapshotItemSchema.valueType(item?.valueType) ||
        !templateSnapshotItemSchema.order(item?.order)
      ) {
        return NextResponse.json(
          { error: "Formato de ítem inválido (id, paramName, valueType, order requeridos)" },
          { status: 400 }
        );
      }
    }

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        labTest: { include: { template: { include: { items: true } } } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
    }

    const parsed = orderItem.templateSnapshot
      ? (() => {
          try {
            return JSON.parse(orderItem.templateSnapshot) as {
              title?: string;
              notes?: string;
              items?: unknown[];
            };
          } catch {
            return null;
          }
        })()
      : null;

    const title =
      parsed?.title ??
      orderItem.labTest.template?.title ??
      "";
    const notes =
      parsed?.notes ??
      orderItem.labTest.template?.notes ??
      null;

    const snapshotItems = items.map((item: Record<string, unknown>) => ({
      id: item.id,
      groupName: item.groupName ?? null,
      paramName: item.paramName,
      unit: item.unit ?? null,
      refRangeText: item.refRangeText ?? null,
      refMin: item.refMin ?? null,
      refMax: item.refMax ?? null,
      valueType: item.valueType,
      selectOptions: Array.isArray(item.selectOptions)
        ? JSON.stringify(item.selectOptions)
        : typeof item.selectOptions === "string"
          ? item.selectOptions
          : "[]",
      order: Number(item.order),
      refRanges: Array.isArray(item.refRanges) ? item.refRanges : [],
    }));

    const newSnapshot = JSON.stringify({
      title,
      notes,
      items: snapshotItems,
    });

    await prisma.labOrderItem.update({
      where: { id: itemId },
      data: { templateSnapshot: newSnapshot },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error updating template snapshot:", error);
    return NextResponse.json(
      { error: "Error al actualizar plantilla del paciente" },
      { status: 500 }
    );
  }
}
