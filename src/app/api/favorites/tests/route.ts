import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ testIds: [] });
    }

    const favs = await prisma.userFavoriteTest.findMany({
      where: { userId: session.user.id },
      select: { labTestId: true },
    });

    return NextResponse.json({
      testIds: favs.map((f) => f.labTestId),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Error al obtener favoritos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { testId, add } = await request.json();
    if (!testId || typeof testId !== "string") {
      return NextResponse.json({ error: "testId requerido" }, { status: 400 });
    }

    if (add) {
      await prisma.userFavoriteTest.upsert({
        where: {
          userId_labTestId: { userId: session.user.id, labTestId: testId },
        },
        create: { userId: session.user.id, labTestId: testId },
        update: {},
      });
    } else {
      await prisma.userFavoriteTest.deleteMany({
        where: {
          userId: session.user.id,
          labTestId: testId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { error: "Error al actualizar favorito" },
      { status: 500 }
    );
  }
}
