import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { testProfileSchema } from "@/features/lab/schemas";

const includeItems = {
  items: {
    orderBy: { order: "asc" as const },
    include: { labTest: { select: { id: true, code: true, name: true, section: true, price: true } } },
  },
} as const;

function mapProfile(p: { id: string; name: string; packagePrice: number | null; items: { labTest: { id: string; code: string; name: string; section: string; price: number } }[] }) {
  return {
    id: p.id,
    name: p.name,
    packagePrice: p.packagePrice != null ? Number(p.packagePrice) : null,
    tests: p.items.map((i) => ({
      id: i.labTest.id,
      code: i.labTest.code,
      name: i.labTest.name,
      section: i.labTest.section,
      price: Number(i.labTest.price),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const profiles = await prisma.testProfile.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: includeItems,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      profiles: profiles.map((p) => mapProfile(p)),
    });
  } catch (error) {
    console.error("Error fetching test profiles:", error);
    return NextResponse.json(
      { error: "Error al obtener perfiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
      include: includeItems,
    });

    return NextResponse.json({ profile: mapProfile(profile) });
  } catch (error) {
    console.error("Error creating test profile:", error);
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
