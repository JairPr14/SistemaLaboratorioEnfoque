import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profiles = await prisma.testProfile.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { labTest: { select: { id: true, code: true, name: true, section: true, price: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        id: p.id,
        name: p.name,
        tests: p.items.map((i) => ({
          id: i.labTest.id,
          code: i.labTest.code,
          name: i.labTest.name,
          section: i.labTest.section,
          price: Number(i.labTest.price),
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching test profiles:", error);
    return NextResponse.json(
      { error: "Error al obtener perfiles" },
      { status: 500 }
    );
  }
}
