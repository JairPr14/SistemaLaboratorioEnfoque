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

/** Guardar cantidad de turnos por personal (pago por turnos) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id: periodId } = await params;
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    for (const item of items) {
      const staffMemberId = item?.staffMemberId;
      const shiftsCount = typeof item?.shiftsCount === "number" && item.shiftsCount >= 0
        ? Math.floor(item.shiftsCount)
        : 0;
      if (!staffMemberId || typeof staffMemberId !== "string") continue;

      const staff = await prisma.staffMember.findFirst({
        where: { id: staffMemberId, isActive: true, paymentType: "POR_TURNOS" },
      });
      if (!staff) continue;

      await prisma.staffShiftCount.upsert({
        where: {
          staffMemberId_payrollPeriodId: { staffMemberId, payrollPeriodId: periodId },
        },
        create: { staffMemberId, payrollPeriodId: periodId, shiftsCount },
        update: { shiftsCount },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error saving shifts:", error);
    return NextResponse.json({ error: "Error al guardar turnos" }, { status: 500 });
  }
}
