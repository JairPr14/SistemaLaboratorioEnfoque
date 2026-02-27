import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { templateSchema } from "@/features/lab/schemas";
import { stringifySelectOptions } from "@/lib/json-helpers";

import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  // GET puede ser público para ver detalles de plantilla
  try {
    const { id } = await params;
    const item = await prisma.labTemplate.findFirst({
      where: { id },
      include: { 
        labTest: true, 
        items: { 
          orderBy: { order: "asc" },
          include: {
            refRanges: {
              orderBy: { order: "asc" }
            }
          }
        } 
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Error al obtener plantilla" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = templateSchema.parse(payload);

    const item = await prisma.$transaction(
      async (tx) => {
        await tx.labTemplateItem.deleteMany({ where: { templateId: id } });

        return tx.labTemplate.update({
        where: { id },
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
      },
      { timeout: 15000 }
    );

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al actualizar plantilla" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.$transaction(
      async (tx) => {
        await tx.labTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.labTemplate.delete({ where: { id } });
      },
      { timeout: 15000 }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting template:", error);
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al eliminar plantilla" },
      { status: 500 },
    );
  }
}
