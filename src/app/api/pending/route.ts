import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPendingAlert } from "@/features/lab/pending";

export async function GET() {
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
    console.error("Error fetching pending orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes pendientes" },
      { status: 500 },
    );
  }
}
