import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { getServerSession, requirePermission, PERMISSION_GESTIONAR_PREANALITICOS } from "@/lib/auth";
import { preAnalyticNoteTemplateSchema } from "@/features/lab/schemas";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const items = await prisma.preAnalyticNoteTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching pre-analytic templates:", error);
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(PERMISSION_GESTIONAR_PREANALITICOS);
  if (auth.response) return auth.response;

  try {
    const payload = await request.json();
    const parsed = preAnalyticNoteTemplateSchema.parse(payload);

    const item = await prisma.preAnalyticNoteTemplate.create({
      data: {
        code: parsed.code.toUpperCase(),
        title: parsed.title.trim(),
        text: parsed.text.trim(),
        isActive: parsed.isActive,
      },
    });
    logger.info("Pre-analytic template created", {
      templateId: item.id,
      byUserId: auth.session.user.id,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error("Error creating pre-analytic template:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una plantilla con ese código" }, { status: 409 });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 });
  }
}
