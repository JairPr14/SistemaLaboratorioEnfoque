import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/features/lab/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  // GET puede ser público para ver catálogo de análisis
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const activeOnly = searchParams.get("active") === "true";
    const items = await prisma.labTest.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { section: true },
      orderBy: [{ section: { order: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Crear análisis requiere permisos administrativos (puede ser ajustado según necesidad)
  // Por ahora solo requiere autenticación

  try {
    const payload = await request.json();
    const parsed = labTestSchema.parse(payload);

    const item = await prisma.labTest.create({
      data: {
        code: parsed.code,
        name: parsed.name,
        sectionId: parsed.sectionId,
        price: parsed.price,
        estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? null,
        isActive: parsed.isActive ?? true,
      },
      include: { section: true },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error creating test:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    // Prisma: clave única (por ejemplo, código de análisis duplicado)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un análisis con ese código." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear análisis" },
      { status: 500 },
    );
  }
}
