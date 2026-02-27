import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/features/lab/schemas";

import {
  getServerSession, hasPermission,
  PERMISSION_EDITAR_PRECIO_CATALOGO,
  PERMISSION_GESTIONAR_CATALOGO,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  // GET puede ser público para ver detalles de análisis
  try {
    const { id } = await params;
    const item = await prisma.labTest.findFirst({
      where: { id, deletedAt: null },
      include: { section: true, referredLab: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSION_GESTIONAR_CATALOGO)) {
    return NextResponse.json({ error: "Sin permiso para actualizar análisis" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = labTestSchema.parse(payload);
    const current = await prisma.labTest.findUnique({
      where: { id },
      select: { price: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }
    const requestedPrice = Number(parsed.price);
    const currentPrice = Number(current.price);
    const priceChanged = Math.abs(requestedPrice - currentPrice) > 0.0001;
    if (priceChanged && !hasPermission(session, PERMISSION_EDITAR_PRECIO_CATALOGO)) {
      return NextResponse.json(
        { error: "No tienes permiso para editar el precio global del catálogo." },
        { status: 403 },
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.labTest.update({
        where: { id },
        data: {
          code: parsed.code,
          name: parsed.name,
          sectionId: parsed.sectionId,
          price: parsed.price,
          estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? null,
          isActive: parsed.isActive ?? true,
          isReferred: parsed.isReferred ?? false,
          // Legacy: mantener compatibilidad
          referredLabId: parsed.referredLabId ?? null,
          priceToAdmission: parsed.priceToAdmission ?? null,
          externalLabCost: parsed.externalLabCost ?? null,
        },
      });

      // Reemplazar opciones de labs referidos
      const options = (parsed.referredLabOptions ?? []).filter(
        (opt) => opt.referredLabId,
      );
      await tx.labTestReferredLab.deleteMany({
        where: { labTestId: id },
      });
      if (options.length > 0) {
        const anyDefault = options.some((o) => o.isDefault);
        await tx.labTestReferredLab.createMany({
          data: options.map((opt, idx) => ({
            labTestId: id,
            referredLabId: opt.referredLabId!,
            priceToAdmission:
              opt.priceToAdmission ??
              parsed.priceToAdmission ??
              parsed.price ??
              0,
            externalLabCost: opt.externalLabCost ?? null,
            isDefault: anyDefault ? !!opt.isDefault : idx === 0,
          })),
        });
        const defaultOpt =
          options.find((o) => o.isDefault) ?? options[0];
        await tx.labTest.update({
          where: { id },
          data: {
            referredLabId: defaultOpt.referredLabId!,
            priceToAdmission:
              defaultOpt.priceToAdmission ??
              parsed.priceToAdmission ??
              parsed.price ??
              0,
            externalLabCost: defaultOpt.externalLabCost ?? null,
            isReferred: true,
          },
        });
      }

      return tx.labTest.findUniqueOrThrow({
        where: { id },
        include: { section: true, referredLab: true },
      });
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating test:", error);
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
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSION_GESTIONAR_CATALOGO)) {
    return NextResponse.json({ error: "Sin permiso para eliminar análisis" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const item = await prisma.labTest.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error deleting test:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al eliminar análisis" },
      { status: 500 },
    );
  }
}
