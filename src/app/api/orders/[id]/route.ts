import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderUpdateSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const item = await prisma.labOrder.findFirst({
      where: { id },
      include: {
        patient: true,
        items: {
          include: {
            labTest: { include: { template: { include: { items: true } } } },
            result: { include: { items: { orderBy: { order: "asc" } } } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Error al obtener orden" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = orderUpdateSchema.parse(payload);

    const item = await prisma.labOrder.update({
      where: { id },
      data: {
        status: parsed.status,
        notes: parsed.notes ?? undefined,
        deliveredAt:
          parsed.deliveredAt !== undefined
            ? parsed.deliveredAt
              ? new Date(parsed.deliveredAt)
              : null
            : parsed.status === "ENTREGADO"
              ? new Date()
              : undefined,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 },
    );
  }
}
