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

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const periods = await prisma.payrollPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }, { quincena: "desc" }],
      include: { _count: { select: { payrolls: true } } },
    });
    return NextResponse.json({ items: periods });
  } catch (error: unknown) {
    logger.error("Error fetching payroll periods:", error);
    const msg =
      error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P1001"
        ? "No se puede conectar con la base de datos. Verifica tu conexión e intenta de nuevo."
        : "Error al obtener períodos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { year, month, quincena } = body as { year?: number; month?: number; quincena?: number };
    if (typeof year !== "number" || year < 2020 || year > 2100) {
      return NextResponse.json({ error: "Año inválido" }, { status: 400 });
    }
    if (typeof month !== "number" || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mes inválido (1-12)" }, { status: 400 });
    }
    const q = typeof quincena === "number" && (quincena === 1 || quincena === 2) ? quincena : 1;
    const existing = await prisma.payrollPeriod.findFirst({ where: { year, month, quincena: q } });
    if (existing) return NextResponse.json({ error: "Ya existe ese período" }, { status: 409 });
    const period = await prisma.payrollPeriod.create({
      data: { year, month, quincena: q },
    });
    return NextResponse.json(period);
  } catch (error) {
    logger.error("Error creating payroll period:", error);
    return NextResponse.json({ error: "Error al crear período" }, { status: 500 });
  }
}
