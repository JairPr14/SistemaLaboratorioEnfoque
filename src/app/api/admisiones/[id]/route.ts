import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authOptions, hasPermission, PERMISSION_AJUSTAR_PRECIO_ADMISION, PERMISSION_GESTIONAR_ADMISION, PERMISSION_VER_ADMISION } from "@/lib/auth";
import { admissionUpdateSchema } from "@/features/lab/schemas";

type Params = { params: Promise<{ id: string }> };

function canViewOrManage(session: Awaited<ReturnType<typeof getServerSession>>) {
  return hasPermission(session ?? null, PERMISSION_VER_ADMISION) || hasPermission(session ?? null, PERMISSION_GESTIONAR_ADMISION);
}

export async function GET(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canViewOrManage(session)) return NextResponse.json({ error: "Sin permiso para ver admisiones" }, { status: 403 });

  const { id } = await params;
  try {
    const item = await prisma.admissionRequest.findUnique({
      where: { id },
      include: {
        patient: true,
        branch: true,
        createdBy: { select: { id: true, name: true, email: true } },
        convertedOrder: { select: { id: true, orderCode: true } },
        items: {
          include: { labTest: { include: { section: true } } },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!item) return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching admission detail:", error);
    return NextResponse.json({ error: "Error al obtener la pre-orden" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasPermission(session, PERMISSION_GESTIONAR_ADMISION)) {
    return NextResponse.json({ error: "Sin permiso para actualizar admisiones" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = admissionUpdateSchema.parse(body);

    const current = await prisma.admissionRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!current) return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });
    if (current.status === "CONVERTIDA") {
      return NextResponse.json({ error: "No se puede editar una pre-orden ya convertida" }, { status: 400 });
    }

    const canAdjust = hasPermission(session, PERMISSION_AJUSTAR_PRECIO_ADMISION);
    const adjustments = new Map(
      parsed.itemAdjustments.map((adj) => [adj.testId, { priceApplied: adj.priceApplied, reason: adj.adjustmentReason ?? null }]),
    );

    const nextItems = current.items.map((item) => {
      const adjustment = adjustments.get(item.labTestId);
      const priceApplied = adjustment?.priceApplied ?? item.priceApplied;
      if (!canAdjust && Math.abs(priceApplied - item.priceBase) > 0.0001) {
        throw new Error("NO_PERMISSION_ADJUSTMENT");
      }
      return {
        id: item.id,
        priceApplied,
        adjustmentReason: adjustment?.reason ?? item.adjustmentReason,
      };
    });

    const totalPrice = nextItems.reduce((acc, item) => acc + item.priceApplied, 0);

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of nextItems) {
        await tx.admissionRequestItem.update({
          where: { id: item.id },
          data: {
            priceApplied: item.priceApplied,
            adjustmentReason: item.adjustmentReason ?? null,
          },
        });
      }

      return tx.admissionRequest.update({
        where: { id },
        data: {
          requestedBy: parsed.requestedBy ?? current.requestedBy,
          notes: parsed.notes ?? current.notes,
          patientType: parsed.patientType ?? current.patientType,
          branchId: parsed.branchId ?? current.branchId,
          status: parsed.status && parsed.status !== "CONVERTIDA" ? parsed.status : current.status,
          totalPrice,
        },
        include: {
          patient: true,
          branch: true,
          items: { include: { labTest: true }, orderBy: { order: "asc" } },
        },
      });
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    logger.error("Error updating admission:", error);
    if (error instanceof Error && error.message === "NO_PERMISSION_ADJUSTMENT") {
      return NextResponse.json(
        { error: "No tienes permiso para ajustar precios puntuales en admisión" },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar la pre-orden" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasPermission(session, PERMISSION_GESTIONAR_ADMISION)) {
    return NextResponse.json({ error: "Sin permiso para cancelar admisiones" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const current = await prisma.admissionRequest.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });
    if (current.status === "CONVERTIDA") {
      return NextResponse.json({ error: "No se puede cancelar una pre-orden convertida" }, { status: 400 });
    }

    const item = await prisma.admissionRequest.update({
      where: { id },
      data: { status: "CANCELADA" },
    });
    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error cancelling admission:", error);
    return NextResponse.json({ error: "Error al cancelar la pre-orden" }, { status: 500 });
  }
}
