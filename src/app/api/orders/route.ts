import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderCreateSchema } from "@/features/lab/schemas";
import { buildOrderCode } from "@/features/lab/order-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const items = await prisma.labOrder.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(patientId ? { patientId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        patient: true,
        items: { include: { labTest: true, result: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = orderCreateSchema.parse(payload);

    const tests = await prisma.labTest.findMany({
      where: { id: { in: parsed.labTestIds }, deletedAt: null, isActive: true },
      include: { template: { include: { items: true } } },
    });

    if (!tests.length) {
      return NextResponse.json({ error: "No hay análisis válidos." }, { status: 400 });
    }

    const totalPrice = tests.reduce((acc, t) => acc + Number(t.price), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.labOrder.count({
      where: { createdAt: { gte: todayStart } },
    });

    const orderCode = buildOrderCode(todayCount + 1);

    const order = await prisma.labOrder.create({
      data: {
        orderCode,
        patientId: parsed.patientId,
        requestedBy: parsed.requestedBy ?? null,
        notes: parsed.notes ?? null,
        totalPrice,
        items: {
          createMany: {
            data: tests.map((test) => ({
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
                      selectOptions: item.selectOptions ?? [],
                      order: item.order,
                    })),
                  } as const)
                : undefined,
            })),
          },
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ item: order });
  } catch (error) {
    console.error("Error creating order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear orden" },
      { status: 500 },
    );
  }
}
