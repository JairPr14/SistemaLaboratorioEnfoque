import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    const pattern = `%${q.toLowerCase().replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    const [patientsRaw, ordersRaw] = await Promise.all([
      prisma.$queryRaw<
        { id: string; firstName: string; lastName: string; dni: string }[]
      >`
      SELECT id, firstName, lastName, dni FROM Patient
      WHERE deletedAt IS NULL
        AND (LOWER(TRIM(firstName)) LIKE ${pattern}
             OR LOWER(TRIM(lastName)) LIKE ${pattern}
             OR LOWER(TRIM(dni)) LIKE ${pattern})
      LIMIT 5
    `,
      prisma.$queryRaw<{ id: string; orderCode: string }[]>`
      SELECT id, orderCode FROM LabOrder
      WHERE LOWER(TRIM(orderCode)) LIKE ${pattern}
      LIMIT 5
    `,
    ]);
    const patients = patientsRaw;
    const orders = ordersRaw;

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
