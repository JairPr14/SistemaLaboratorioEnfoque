import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resultSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, itemId } = await params;
    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId: id },
      include: {
        labTest: { include: { template: { include: { items: true } } } },
        result: { include: { items: { orderBy: { order: "asc" } } } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item: orderItem });
  } catch (error) {
    console.error("Error fetching result:", error);
    return NextResponse.json(
      { error: "Error al obtener resultado" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  return upsertResult(request, params);
}

export async function PUT(request: Request, { params }: Params) {
  return upsertResult(request, params);
}

async function upsertResult(request: Request, paramsPromise: Params["params"]) {
  try {
    const params = await paramsPromise;
    const payload = await request.json();
    const parsed = resultSchema.parse(payload);

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: params.itemId, orderId: params.id },
      include: { order: true },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.labResult.findUnique({
        where: { orderItemId: orderItem.id },
      });

      const data = {
        reportedAt: new Date(),
        reportedBy: parsed.reportedBy ?? null,
        comment: parsed.comment ?? null,
        isDraft: false,
      };

      const saved = existing
        ? await tx.labResult.update({
            where: { id: existing.id },
            data,
          })
        : await tx.labResult.create({
            data: { orderItemId: orderItem.id, ...data },
          });

      await tx.labResultItem.deleteMany({ where: { resultId: saved.id } });
      await tx.labResultItem.createMany({
        data: parsed.items.map((item) => ({
          resultId: saved.id,
          templateItemId: item.templateItemId ?? null,
          paramNameSnapshot: item.paramNameSnapshot,
          unitSnapshot: item.unitSnapshot ?? null,
          refTextSnapshot: item.refTextSnapshot ?? null,
          refMinSnapshot: item.refMinSnapshot ?? null,
          refMaxSnapshot: item.refMaxSnapshot ?? null,
          value: item.value,
          isOutOfRange: item.isOutOfRange ?? false,
          order: item.order,
        })),
      });

      await tx.labOrderItem.update({
        where: { id: orderItem.id },
        data: { status: "COMPLETADO" },
      });

      const remaining = await tx.labOrderItem.count({
        where: { orderId: orderItem.orderId, status: { not: "COMPLETADO" } },
      });

      if (remaining === 0 && orderItem.order.status !== "ANULADO") {
        await tx.labOrder.update({
          where: { id: orderItem.orderId },
          data: { status: "COMPLETADO" },
        });
      }

      return saved;
    });

    return NextResponse.json({ item: result });
  } catch (error) {
    console.error("Error upserting result:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al guardar resultado" },
      { status: 500 },
    );
  }
}
