import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/features/lab/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const items = await prisma.labTest.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = labTestSchema.parse(payload);

    const item = await prisma.labTest.create({
      data: {
        ...parsed,
        price: parsed.price,
        estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? null,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error creating test:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear análisis" },
      { status: 500 },
    );
  }
}
