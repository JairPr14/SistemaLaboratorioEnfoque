import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSION_GESTIONAR_PREANALITICOS } from "@/lib/auth";
import { preAnalyticNoteTemplateSchema } from "@/features/lab/schemas";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_GESTIONAR_PREANALITICOS);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = preAnalyticNoteTemplateSchema.parse(payload);
    const item = await prisma.preAnalyticNoteTemplate.update({
      where: { id },
      data: {
        code: parsed.code.toUpperCase(),
        title: parsed.title.trim(),
        text: parsed.text.trim(),
        isActive: parsed.isActive,
      },
    });
    logger.info("Pre-analytic template updated", {
      templateId: id,
      byUserId: auth.session.user.id,
    });
    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating pre-analytic template:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una plantilla con ese código" }, { status: 409 });
    }
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_GESTIONAR_PREANALITICOS);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    await prisma.preAnalyticNoteTemplate.delete({ where: { id } });
    logger.info("Pre-analytic template deleted", {
      templateId: id,
      byUserId: auth.session.user.id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting pre-analytic template:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 });
  }
}
