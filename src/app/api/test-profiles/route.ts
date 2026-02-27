import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { testProfileSchema } from "@/features/lab/schemas";
import { requirePermission, PERMISSION_GESTIONAR_CATALOGO } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { mapTestProfile, testProfileIncludeItems } from "@/lib/test-profiles";

export async function GET(request: Request) {
  // GET puede ser público para que todos vean las promociones disponibles
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const profiles = await prisma.testProfile.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: testProfileIncludeItems,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      profiles: profiles.map((p) => mapTestProfile(p)),
    });
  } catch (error) {
    logger.error("Error fetching test profiles:", error);
    return NextResponse.json(
      { error: "Error al obtener perfiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(PERMISSION_GESTIONAR_CATALOGO);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = testProfileSchema.parse(body);

    const profile = await prisma.testProfile.create({
      data: {
        name: parsed.name.trim(),
        packagePrice: parsed.packagePrice ?? undefined,
        isActive: true,
        items: {
          create: parsed.labTestIds.map((labTestId, index) => ({
            labTestId,
            order: index,
          })),
        },
      },
      include: testProfileIncludeItems,
    });

    return NextResponse.json({ profile: mapTestProfile(profile) });
  } catch (error) {
    logger.error("Error creating test profile:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear la promoción" },
      { status: 500 }
    );
  }
}
