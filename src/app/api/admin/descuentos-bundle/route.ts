/**
 * API unificada para DescuentosTab: staff + discount-types + staff-discounts en 1 petición.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { getServerSession, ADMIN_ROLE_CODE } from "@/lib/auth";
import { logger } from "@/lib/logger";

async function ensureAdmin() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.roleCode !== ADMIN_ROLE_CODE) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const where: Record<string, unknown> = {};
    if (year) where.periodYear = parseInt(year, 10);
    if (month) where.periodMonth = parseInt(month, 10);

    const [staffRes, typesRes, discountsRes] = await withDbRetry(async () => {
      const staff = await prisma.staffMember.findMany({
        orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      });
      const types = await prisma.discountType.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      const discounts = await prisma.staffDiscount.findMany({
        where: where as { periodYear?: number; periodMonth?: number },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
        include: {
          staffMember: { select: { id: true, firstName: true, lastName: true } },
          discountType: { select: { id: true, code: true, name: true } },
        },
      });
      return [staff, types, discounts] as const;
    });

    const staff = staffRes.filter((s) => s.isActive);
    const res = NextResponse.json({
      staff,
      discountTypes: typesRes,
      staffDiscounts: discountsRes,
    });
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (error) {
    logger.error("Error fetching descuentos bundle:", error);
    return NextResponse.json(
      { error: "Error al cargar descuentos" },
      { status: 500 },
    );
  }
}
