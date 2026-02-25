import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { testProfileSchema } from "@/features/lab/schemas";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { mapTestProfile, testProfileIncludeItems } from "@/lib/test-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // GET puede ser público para ver detalles de promoción
  try {
    const { id } = await params;
    const profile = await prisma.testProfile.findUnique({
      where: { id },
      include: testProfileIncludeItems,
    });
    if (!profile) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ profile: mapTestProfile(profile) });
  } catch (error) {
    logger.error("Error fetching test profile:", error);
    return NextResponse.json(
      { error: "Error al obtener la promoción" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = testProfileSchema.parse(body);

    await prisma.$transaction([
      prisma.testProfileItem.deleteMany({ where: { profileId: id } }),
      prisma.testProfile.update({
        where: { id },
        data: {
          name: parsed.name.trim(),
          packagePrice: parsed.packagePrice ?? null,
          items: {
            create: parsed.labTestIds.map((labTestId, index) => ({
              labTestId,
              order: index,
            })),
          },
        },
      }),
    ]);

    const profile = await prisma.testProfile.findUnique({
      where: { id },
      include: testProfileIncludeItems,
    });
    if (!profile) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ profile: mapTestProfile(profile) });
  } catch (error) {
    logger.error("Error updating test profile:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar la promoción" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    await prisma.testProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error deleting test profile:", error);
    return NextResponse.json(
      { error: "Error al eliminar la promoción" },
      { status: 500 }
    );
  }
}
