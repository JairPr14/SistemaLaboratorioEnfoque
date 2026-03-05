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

/** Reporte detallado de gestión administrativa: personal, planilla, descuentos */
export async function GET(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const periodWhere: Record<string, unknown> = {};
    if (year) periodWhere.year = parseInt(year, 10);
    if (month) periodWhere.month = parseInt(month, 10);

    const discountWhere: Record<string, number> = {};
    if (year) discountWhere.periodYear = parseInt(year, 10);
    if (month) discountWhere.periodMonth = parseInt(month, 10);

    const [staff, periods, allPayrolls] = await Promise.all([
      prisma.staffMember.findMany({
        orderBy: [{ isActive: "desc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          salary: true,
          paymentType: true,
          ratePerShift: true,
          isActive: true,
          hireDate: true,
        },
      }),
      prisma.payrollPeriod.findMany({
        where: Object.keys(periodWhere).length > 0 ? periodWhere : undefined,
        orderBy: [{ year: "desc" }, { month: "desc" }, { quincena: "desc" }],
      }),
      prisma.payroll.findMany({
        include: {
          staffMember: { select: { id: true, firstName: true, lastName: true, jobTitle: true, paymentType: true } },
          payrollPeriod: { select: { id: true, year: true, month: true, quincena: true } },
        },
        orderBy: [
          { payrollPeriod: { year: "desc" } },
          { payrollPeriod: { month: "desc" } },
          { payrollPeriod: { quincena: "desc" } },
        ],
      }),
    ]);

    const periodIds = new Set(periods.map((p) => p.id));
    const payrolls = allPayrolls.filter((p) => periodIds.has(p.payrollPeriodId));

    const discountsFiltered = await prisma.staffDiscount.findMany({
      where: Object.keys(discountWhere).length > 0 ? (discountWhere as { periodYear?: number; periodMonth?: number }) : undefined,
      include: {
        staffMember: { select: { firstName: true, lastName: true } },
        discountType: { select: { code: true, name: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { periodQuincena: "desc" }],
    });

    const activeStaff = staff.filter((s) => s.isActive);
    const staffSummary = {
      total: staff.length,
      activos: activeStaff.length,
      inactivos: staff.length - activeStaff.length,
      mensuales: activeStaff.filter((s) => s.paymentType === "MENSUAL").length,
      porTurnos: activeStaff.filter((s) => s.paymentType === "POR_TURNOS").length,
    };

    const payrollTotals = payrolls.reduce(
      (acc, p) => {
        acc.totalBase += p.baseSalary;
        acc.totalDiscounts += p.discountsTotal;
        acc.totalNet += p.netSalary;
        if (p.status === "PAGADO") acc.totalPagado += p.netSalary;
        else acc.totalPendiente += p.netSalary;
        return acc;
      },
      { totalBase: 0, totalDiscounts: 0, totalNet: 0, totalPagado: 0, totalPendiente: 0 }
    );

    const discountsTotal = discountsFiltered.reduce((sum, d) => sum + d.amount, 0);

    return NextResponse.json({
      staffSummary,
      staff,
      periods,
      payrolls,
      payrollTotals,
      discounts: discountsFiltered,
      discountsTotal,
    });
  } catch (error) {
    logger.error("Error fetching reporte detallado:", error);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
