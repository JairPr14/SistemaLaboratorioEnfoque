import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labSectionSchema } from "@/features/lab/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const sections = await prisma.labSection.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { labTests: true } } },
    });
    return NextResponse.json({ sections });
  } catch (error) {
    logger.error("Error fetching sections:", error);
    return NextResponse.json(
      { error: "Error al obtener secciones" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = labSectionSchema.parse(payload);

    const existing = await prisma.labSection.findUnique({
      where: { code: parsed.code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una sección con código ${parsed.code}` },
        { status: 400 },
      );
    }

    const section = await prisma.labSection.create({
      data: {
        code: parsed.code.toUpperCase(),
        name: parsed.name,
        order: parsed.order,
        isActive: parsed.isActive,
      },
    });
    return NextResponse.json({ section });
  } catch (error) {
    logger.error("Error creating section:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear sección" },
      { status: 500 },
    );
  }
}
