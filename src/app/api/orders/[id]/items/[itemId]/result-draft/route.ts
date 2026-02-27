import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resultDraftSchema } from "@/features/lab/schemas";
import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: orderId, itemId } = await params;
    const payload = await request.json();
    const parsed = resultDraftSchema.parse(payload);

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        result: true,
        labTest: { include: { template: { include: { items: { select: { id: true } } } } } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    // Solo los IDs de LabTemplateItem son válidos para la FK; los extra (extra-xxx) no existen en BD
    const templateIds = new Set(
      orderItem.labTest.template?.items?.map((i) => i.id) ?? []
    );

    const saved = await prisma.$transaction(async (tx) => {
      let result = orderItem.result;
      if (!result) {
        result = await tx.labResult.create({
          data: {
            orderItemId: orderItem.id,
            isDraft: true,
          },
        });
      }

      await tx.labResultItem.deleteMany({ where: { resultId: result.id } });
      await tx.labResultItem.createMany({
        data: parsed.items.map((item) => ({
          resultId: result!.id,
          templateItemId:
            item.templateItemId && templateIds.has(item.templateItemId)
              ? item.templateItemId
              : null,
          paramNameSnapshot: item.paramNameSnapshot,
          unitSnapshot: item.unitSnapshot ?? null,
          refTextSnapshot: item.refTextSnapshot ?? null,
          refMinSnapshot: item.refMinSnapshot ?? null,
          refMaxSnapshot: item.refMaxSnapshot ?? null,
          value: item.value,
          isOutOfRange: item.isOutOfRange ?? false,
          isHighlighted: item.isHighlighted ?? false,
          order: item.order,
        })),
      });

      return tx.labResult.update({
        where: { id: result.id },
        data: { isDraft: true, updatedAt: new Date() },
      });
    });

    const savedAt = new Date();
    return NextResponse.json({
      savedAt: savedAt.toISOString(),
      isDraft: true,
    });
  } catch (error) {
    logger.error("Error saving draft:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al guardar borrador" },
      { status: 500 }
    );
  }
}
