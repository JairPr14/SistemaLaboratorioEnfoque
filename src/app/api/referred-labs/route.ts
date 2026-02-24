import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_GESTIONAR_LAB_REFERIDOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { referredLabSchema } from "@/features/lab/schemas";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const items = await prisma.referredLab.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { labTests: true } } },
    });
    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching referred labs:", error);
    return NextResponse.json({ error: "Error al obtener laboratorios referidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canManage =
    hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_LAB_REFERIDOS);
  if (!canManage) {
    return NextResponse.json({ error: "Sin permiso para crear laboratorios referidos" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = referredLabSchema.parse(body);

    const item = await prisma.referredLab.create({
      data: {
        name: parsed.name,
        logoUrl: parsed.logoUrl ?? null,
        stampImageUrl: parsed.stampImageUrl ?? null,
        isActive: parsed.isActive ?? true,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error creating referred lab:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear laboratorio referido" }, { status: 500 });
  }
}
