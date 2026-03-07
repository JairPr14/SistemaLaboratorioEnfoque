import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resultDraftSchema } from "@/features/lab/schemas";
import { requirePermission, PERMISSION_CAPTURAR_RESULTADOS } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_CAPTURAR_RESULTADOS);
  if (auth.response) return auth.response;

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

    // Bloqueo: no modificar borradores si el resultado ya está validado
    if (orderItem.result && !orderItem.result.isDraft) {
      return NextResponse.json(
        { error: "El resultado ya está validado. No se pueden guardar cambios en borrador." },
        { status: 403 },
      );
    }

    // Solo los IDs de LabTemplateItem son válidos para la FK; los extra (extra-xxx) no existen en BD
    const templateIds = new Set(
      orderItem.labTest.template?.items?.map((i) => i.id) ?? []
    );

    const saved = await prisma.$transaction(async (tx) => {
      let result = orderItem.result;
      if (!result) {
        result = await tx.labResult.upsert({
          where: { orderItemId: orderItem.id },
          create: {
            orderItemId: orderItem.id,
            isDraft: true,
          },
          update: { isDraft: true },
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
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    return handleApiError(error, "Error al guardar borrador");
  }
}
