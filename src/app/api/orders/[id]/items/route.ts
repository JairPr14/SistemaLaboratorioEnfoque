import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderAddItemsSchema } from "@/features/lab/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;
    const payload = await request.json();
    const parsed = orderAddItemsSchema.parse(payload);

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: { 
        items: { 
          select: { 
            labTestId: true,
            promotionId: true 
          } 
        } 
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.status === "ANULADO") {
      return NextResponse.json(
        { error: "No se pueden añadir análisis a una orden anulada." },
        { status: 400 },
      );
    }

    // Verificar análisis existentes (tanto sueltos como en promociones)
    const existingLabTestIds = new Set(order.items.map((i) => i.labTestId));
    
    // Si hay promociones en la orden, verificar que los análisis a agregar no estén en esas promociones
    const itemsWithPromotions = order.items.filter((i) => i.promotionId != null);
    if (itemsWithPromotions.length > 0) {
      const promotionIds = itemsWithPromotions
        .map((i) => i.promotionId)
        .filter((id): id is string => id != null);
      if (promotionIds.length > 0) {
        const profiles = await prisma.testProfile.findMany({
          where: { id: { in: promotionIds } },
          include: { items: { select: { labTestId: true } } },
        });
        
        const testIdsInPromotions = new Set(
          profiles.flatMap((p) => p.items.map((i) => i.labTestId))
        );
        
        const duplicatesInPromotions = parsed.labTestIds.filter((id) => testIdsInPromotions.has(id));
        if (duplicatesInPromotions.length > 0) {
          return NextResponse.json(
            { 
              error: `Los siguientes análisis ya están incluidos en promociones de esta orden: ${duplicatesInPromotions.join(", ")}. No se pueden agregar duplicados.` 
            },
            { status: 400 },
          );
        }
      }
    }
    
    const uniqueRequestedIds = [...new Set(parsed.labTestIds)];
    const labTestIdsToAdd = uniqueRequestedIds.filter((tid) => !existingLabTestIds.has(tid));

    if (labTestIdsToAdd.length === 0) {
      return NextResponse.json(
        { error: "Todos los análisis seleccionados ya están en la orden o están repetidos." },
        { status: 400 },
      );
    }

    const tests = await prisma.labTest.findMany({
      where: {
        id: { in: labTestIdsToAdd },
        deletedAt: null,
        isActive: true,
      },
      include: {
        template: {
          include: {
            items: {
              include: { refRanges: { orderBy: { order: "asc" } } },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!tests.length) {
      return NextResponse.json(
        { error: "Ningún análisis válido para añadir." },
        { status: 400 },
      );
    }

    const currentTotal = Number(order.totalPrice);
    const addedPrice = tests.reduce((acc, t) => acc + Number(t.price), 0);
    const newTotal = currentTotal + addedPrice;

    await prisma.$transaction(async (tx) => {
      await tx.labOrderItem.createMany({
        data: tests.map((test) => ({
          orderId,
          labTestId: test.id,
          priceSnapshot: test.price,
          templateSnapshot: (test.template
            ? JSON.stringify({
                title: test.template.title,
                notes: test.template.notes,
                items: test.template.items.map((item) => ({
                  id: item.id,
                  groupName: item.groupName,
                  paramName: item.paramName,
                  unit: item.unit,
                  refRangeText: item.refRangeText,
                  refMin: item.refMin ? Number(item.refMin) : null,
                  refMax: item.refMax ? Number(item.refMax) : null,
                  valueType: item.valueType,
                  selectOptions: item.selectOptions ?? "[]",
                  order: item.order,
                  refRanges: (item.refRanges ?? []).map((r) => ({
                    ageGroup: r.ageGroup,
                    sex: r.sex,
                    refRangeText: r.refRangeText,
                    refMin: r.refMin,
                    refMax: r.refMax,
                    order: r.order ?? 0,
                  })),
                })),
              })
            : undefined) as string | undefined,
        })),
      });

      await tx.labOrder.update({
        where: { id: orderId },
        data: { totalPrice: newTotal },
      });
    });

    return NextResponse.json({
      success: true,
      added: tests.length,
      newTotal,
    });
  } catch (error) {
    logger.error("Error adding items to order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al añadir análisis a la orden" },
      { status: 500 },
    );
  }
}
