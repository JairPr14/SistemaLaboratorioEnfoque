import { NextResponse } from "next/server";

import { getServerSession, hasPermission, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_GESTIONAR_LAB_REFERIDOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { referredLabSchema } from "@/features/lab/schemas";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const item = await prisma.referredLab.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Laboratorio referido no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching referred lab:", error);
    return NextResponse.json({ error: "Error al obtener laboratorio referido" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canManage =
    hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_LAB_REFERIDOS);
  if (!canManage) {
    return NextResponse.json({ error: "Sin permiso para actualizar laboratorios referidos" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = referredLabSchema.parse(body);

    const data: { name: string; logoUrl?: string | null; stampImageUrl?: string | null; isActive: boolean } = {
      name: parsed.name,
      isActive: parsed.isActive ?? true,
    };
    if ("logoUrl" in body) {
      data.logoUrl = parsed.logoUrl ?? null;
      if (data.logoUrl === null) {
        await prisma.storedImage.deleteMany({ where: { key: `referred-lab:${id}:logo` } }).catch(() => {});
      }
    }
    if ("stampImageUrl" in body) {
      data.stampImageUrl = parsed.stampImageUrl ?? null;
      if (data.stampImageUrl === null) {
        await prisma.storedImage.deleteMany({ where: { key: `referred-lab:${id}:stamp` } }).catch(() => {});
      }
    }

    const item = await prisma.referredLab.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating referred lab:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Laboratorio referido no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error al actualizar laboratorio referido" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canManage =
    hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_LAB_REFERIDOS);
  if (!canManage) {
    return NextResponse.json({ error: "Sin permiso para eliminar laboratorios referidos" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verificar que no haya análisis referidos usando este laboratorio
    const testsUsing = await prisma.labTest.count({
      where: { referredLabId: id, deletedAt: null },
    });
    if (testsUsing > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${testsUsing} análisis usan este laboratorio referido` },
        { status: 400 }
      );
    }

    await prisma.storedImage.deleteMany({
      where: { key: { in: [`referred-lab:${id}:logo`, `referred-lab:${id}:stamp`] } },
    }).catch(() => {});
    await prisma.referredLab.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting referred lab:", error);
    if (error instanceof Error && error.message.includes("Record to delete not found")) {
      return NextResponse.json({ error: "Laboratorio referido no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error al eliminar laboratorio referido" }, { status: 500 });
  }
}
