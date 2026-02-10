import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    const search = `%${q}%`;
    const [patients, orders] = await Promise.all([
      prisma.patient.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { dni: { contains: q } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, dni: true },
        take: 5,
      }),
      prisma.labOrder.findMany({
        where: { orderCode: { contains: q } },
        select: { id: true, orderCode: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        type: "patient",
        label: `${p.lastName} ${p.firstName}`,
        sublabel: p.dni,
        href: `/patients/${p.id}`,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        type: "order",
        label: o.orderCode,
        sublabel: "Orden",
        href: `/orders/${o.id}`,
      })),
    });
  } catch {
    return NextResponse.json({ patients: [], orders: [] }, { status: 200 });
  }
}
