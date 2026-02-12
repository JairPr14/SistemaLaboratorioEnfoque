import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { templateSchema } from "@/features/lab/schemas";
import { stringifySelectOptions } from "@/lib/json-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  // GET puede ser público para ver plantillas disponibles
  try {
    const items = await prisma.labTemplate.findMany({
      include: { labTest: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Error al obtener plantillas" },
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
    const parsed = templateSchema.parse(payload);

    const existing = await prisma.labTemplate.findFirst({
      where: { labTestId: parsed.labTestId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una plantilla para este análisis." },
        { status: 400 },
      );
    }

    const item = await prisma.labTemplate.create({
      data: {
        labTestId: parsed.labTestId,
        title: parsed.title,
        notes: parsed.notes ?? null,
        items: {
          create: parsed.items.map((i) => ({
            groupName: i.groupName ?? null,
            paramName: i.paramName,
            unit: i.unit ?? null,
            refRangeText: i.refRangeText ?? null,
            refMin: i.refMin ?? null,
            refMax: i.refMax ?? null,
            valueType: i.valueType,
            selectOptions: stringifySelectOptions(i.selectOptions ?? []),
            order: i.order,
            refRanges: {
              create: (i.refRanges ?? []).map((r) => ({
                ageGroup: r.ageGroup ?? null,
                sex: r.sex ?? null,
                refRangeText: r.refRangeText ?? null,
                refMin: r.refMin ?? null,
                refMax: r.refMax ?? null,
                order: r.order ?? 0,
              })),
            },
          })),
        },
      },
      include: { 
        items: { 
          include: { 
            refRanges: true 
          } 
        } 
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error creating template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear plantilla" },
      { status: 500 },
    );
  }
}
