import { revalidatePath } from "next/cache";
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

const PAYROLL_PAYMENT_METHODS = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA"] as const;

/** Registra el pago: crea planilla si no existe y la marca como pagada */
export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { periodId, staffMemberId, paymentMethod, transferNumber } = body as {
      periodId?: string;
      staffMemberId?: string;
      paymentMethod?: string;
      transferNumber?: string;
    };

    if (!periodId || !staffMemberId) {
      return NextResponse.json({ error: "periodId y staffMemberId son requeridos" }, { status: 400 });
    }

    const method =
      paymentMethod && PAYROLL_PAYMENT_METHODS.includes(paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
        ? (paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
        : "EFECTIVO";

    const transfer =
      method === "TRANSFERENCIA" && typeof transferNumber === "string" && transferNumber.trim()
        ? transferNumber.trim()
        : null;

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const staff = await prisma.staffMember.findUnique({
      where: { id: staffMemberId, isActive: true },
      select: { id: true, salary: true, paymentType: true, ratePerShift: true },
    });
    if (!staff) return NextResponse.json({ error: "Trabajador no encontrado o inactivo" }, { status: 404 });

    const periodQuincena = period.quincena ?? 1;

    const [existingPayroll, pendingDiscounts, shiftCount] = await Promise.all([
      prisma.payroll.findUnique({
        where: { staffMemberId_payrollPeriodId: { staffMemberId: staffMemberId, payrollPeriodId: periodId } },
      }),
      prisma.staffDiscount.findMany({
        where: {
          staffMemberId,
          periodYear: period.year,
          periodMonth: period.month,
          periodQuincena,
          status: "PENDIENTE",
        },
      }),
      prisma.staffShiftCount.findUnique({
        where: {
          staffMemberId_payrollPeriodId: { staffMemberId, payrollPeriodId: periodId },
        },
      }),
    ]);

    if (existingPayroll) {
      await prisma.payroll.update({
        where: { id: existingPayroll.id },
        data: {
          status: "PAGADO",
          paymentMethod: method,
          transferNumber: method === "TRANSFERENCIA" ? transfer : null,
          paidAt: existingPayroll.paidAt ?? new Date(),
        },
      });
      const updated = await prisma.payroll.findUnique({
        where: { id: existingPayroll.id },
        include: { staffMember: true },
      });
      revalidatePath("/gestion-administrativa-clinica");
      return NextResponse.json(updated);
    }

    const isPorTurnos = staff.paymentType === "POR_TURNOS";
    const baseSalary = isPorTurnos
      ? (shiftCount?.shiftsCount ?? 0) * (staff.ratePerShift ?? 0)
      : (staff.salary ?? 0) / 2;
    const discountsTotal = pendingDiscounts.reduce((sum, d) => sum + d.amount, 0);
    const netSalary = Math.max(0, baseSalary - discountsTotal);

    const payroll = await prisma.$transaction(async (tx) => {
      const created = await tx.payroll.create({
        data: {
          staffMemberId,
          payrollPeriodId: periodId,
          baseSalary,
          discountsTotal,
          netSalary,
          status: "PAGADO",
          paymentMethod: method,
          transferNumber: method === "TRANSFERENCIA" ? transfer : null,
          paidAt: new Date(),
        },
        include: { staffMember: true },
      });

      for (const d of pendingDiscounts) {
        await tx.staffDiscount.update({
          where: { id: d.id },
          data: { status: "APLICADO", payrollId: created.id },
        });
      }

      return created;
    });
    revalidatePath("/gestion-administrativa-clinica");

    return NextResponse.json(payroll);
  } catch (error) {
    logger.error("Error paying payroll:", error);
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 });
  }
}
