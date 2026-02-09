import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const item = await prisma.labTest.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = labTestSchema.parse(payload);

    const item = await prisma.labTest.update({
      where: { id },
      data: {
        ...parsed,
        price: parsed.price,
        estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? null,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating test:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al actualizar análisis" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const item = await prisma.labTest.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error deleting test:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al eliminar análisis" },
      { status: 500 },
    );
  }
}
