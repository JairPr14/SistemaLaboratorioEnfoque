import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { testProfileSchema } from "@/features/lab/schemas";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

const includeItems = {
  items: {
    orderBy: { order: "asc" as const },
    include: { labTest: { include: { section: true } } },
  },
} as const;

function mapProfile(p: { id: string; name: string; packagePrice: number | null; items: { labTest: { id: string; code: string; name: string; section: { code: string } | null; price: number } }[] }) {
  return {
    id: p.id,
    name: p.name,
    packagePrice: p.packagePrice != null ? Number(p.packagePrice) : null,
    tests: p.items.map((i) => ({
      id: i.labTest.id,
      code: i.labTest.code,
      name: i.labTest.name,
      section: i.labTest.section?.code ?? "",
      price: Number(i.labTest.price),
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // GET puede ser público para ver detalles de promoción
  try {
    const { id } = await params;
    const profile = await prisma.testProfile.findUnique({
      where: { id },
      include: includeItems,
    });
    if (!profile) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ profile: mapProfile(profile) });
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
      include: includeItems,
    });
    if (!profile) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ profile: mapProfile(profile) });
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
