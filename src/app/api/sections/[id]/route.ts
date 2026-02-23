import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labSectionSchema } from "@/features/lab/schemas";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const section = await prisma.labSection.findUnique({
      where: { id },
      include: { _count: { select: { labTests: true } } },
    });
    if (!section) {
      return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error fetching section:", error);
    return NextResponse.json(
      { error: "Error al obtener sección" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = labSectionSchema.parse(payload);

    const existing = await prisma.labSection.findFirst({
      where: {
        code: parsed.code.toUpperCase(),
        NOT: { id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe otra sección con código ${parsed.code}` },
        { status: 400 },
      );
    }

    const section = await prisma.labSection.update({
      where: { id },
      data: {
        code: parsed.code.toUpperCase(),
        name: parsed.name,
        order: parsed.order,
        isActive: parsed.isActive,
      },
    });
    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error updating section:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar sección" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;

    const section = await prisma.labSection.findUnique({
      where: { id },
      include: { _count: { select: { labTests: true } } },
    });
    if (!section) {
      return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }
    if (section._count.labTests > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${section._count.labTests} análisis asignados. Reasigna los análisis a otra sección primero.` },
        { status: 400 },
      );
    }

    await prisma.labSection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting section:", error);
    return NextResponse.json(
      { error: "Error al eliminar sección" },
      { status: 500 },
    );
  }
}
