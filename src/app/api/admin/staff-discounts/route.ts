import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const items = await prisma.staffDiscount.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: {
        staffMember: { select: { id: true, firstName: true, lastName: true } },
        discountType: { select: { id: true, code: true, name: true } },
      },
    });
    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching staff discounts:", error);
    return NextResponse.json({ error: "Error al obtener descuentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { staffMemberId, discountTypeId, amount, periodYear, periodMonth, periodQuincena } = body as {
      staffMemberId?: string;
      discountTypeId?: string;
      amount?: number;
      periodYear?: number;
      periodMonth?: number;
      periodQuincena?: number;
    };

    if (!staffMemberId || !discountTypeId) {
      return NextResponse.json({ error: "Colaborador y tipo de descuento son obligatorios" }, { status: 400 });
    }
    if (typeof amount !== "number" || amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Monto debe ser un número positivo" }, { status: 400 });
    }
    if (typeof periodYear !== "number" || periodYear < 2020 || periodYear > 2100) {
      return NextResponse.json({ error: "Año inválido" }, { status: 400 });
    }
    if (typeof periodMonth !== "number" || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: "Mes inválido (1-12)" }, { status: 400 });
    }
    const q = typeof periodQuincena === "number" && (periodQuincena === 1 || periodQuincena === 2) ? periodQuincena : 1;

    const discountType = await prisma.discountType.findUnique({
      where: { id: discountTypeId },
      select: { splitAcrossQuincenas: true, name: true },
    });
    const splitAcrossQuincenas = discountType?.splitAcrossQuincenas ?? false;

    const halfAmount = splitAcrossQuincenas ? Math.round((amount / 2) * 100) / 100 : amount;

    if (splitAcrossQuincenas) {
      // AFP, ONP, Salud: un solo descuento mensual dividido en ambas quincenas (validar que no exista duplicado)
      const existente = await prisma.staffDiscount.findFirst({
        where: {
          staffMemberId,
          discountTypeId,
          periodYear,
          periodMonth,
        },
      });
      if (existente) {
        return NextResponse.json(
          {
            error: `Ya existe un descuento de ${discountType?.name ?? "este tipo"} para este colaborador en ${periodMonth}/${periodYear}. Solo se permite uno por mes (se divide en ambas quincenas).`,
          },
          { status: 409 }
        );
      }
      // Crear 2 registros (mitad en Q1, mitad en Q2)
      const [q1, q2] = await prisma.$transaction([
        prisma.staffDiscount.create({
          data: {
            staffMemberId,
            discountTypeId,
            amount: halfAmount,
            periodYear,
            periodMonth,
            periodQuincena: 1,
          },
          include: {
            staffMember: { select: { firstName: true, lastName: true } },
            discountType: { select: { name: true } },
          },
        }),
        prisma.staffDiscount.create({
          data: {
            staffMemberId,
            discountTypeId,
            amount: halfAmount,
            periodYear,
            periodMonth,
            periodQuincena: 2,
          },
          include: {
            staffMember: { select: { firstName: true, lastName: true } },
            discountType: { select: { name: true } },
          },
        }),
      ]);
      return NextResponse.json({ created: 2, items: [q1, q2] });
    }

    const item = await prisma.staffDiscount.create({
      data: {
        staffMemberId,
        discountTypeId,
        amount: halfAmount,
        periodYear,
        periodMonth,
        periodQuincena: q,
      },
      include: {
        staffMember: { select: { firstName: true, lastName: true } },
        discountType: { select: { name: true } },
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    logger.error("Error creating staff discount:", error);
    return NextResponse.json({ error: "Error al crear descuento" }, { status: 500 });
  }
}
