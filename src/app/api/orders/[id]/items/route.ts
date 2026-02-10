import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderAddItemsSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: orderId } = await params;
    const payload = await request.json();
    const parsed = orderAddItemsSchema.parse(payload);

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: { items: { select: { labTestId: true } } },
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

    const existingLabTestIds = new Set(order.items.map((i) => i.labTestId));
    const labTestIdsToAdd = parsed.labTestIds.filter((tid) => !existingLabTestIds.has(tid));

    if (labTestIdsToAdd.length === 0) {
      return NextResponse.json(
        { error: "Todos los análisis seleccionados ya están en la orden." },
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
          templateSnapshot: test.template
            ? ({
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
              } as const)
            : undefined,
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
    console.error("Error adding items to order:", error);
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
