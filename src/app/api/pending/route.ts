import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPendingAlert } from "@/features/lab/pending";

import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const items = await prisma.labOrder.findMany({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
      include: { patient: true },
      orderBy: { createdAt: "asc" },
    });

    const enriched = items.map((item) => ({
      ...item,
      alert: getPendingAlert(item.status, item.createdAt),
    }));

    return NextResponse.json({ items: enriched });
  } catch (error) {
    logger.error("Error fetching pending orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes pendientes" },
      { status: 500 },
    );
  }
}
