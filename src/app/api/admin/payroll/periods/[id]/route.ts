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

/** Lista personal activo con sueldos quincenales y descuentos del período */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const periodQuincena = period.quincena ?? 1;
    const [staff, payrolls, pendingDiscounts] = await Promise.all([
      prisma.staffMember.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          salary: true,
        },
      }),
      prisma.payroll.findMany({
        where: { payrollPeriodId: id },
        include: { staffMember: { select: { firstName: true, lastName: true, jobTitle: true } } },
      }),
      prisma.staffDiscount.findMany({
        where: {
          periodYear: period.year,
          periodMonth: period.month,
          periodQuincena,
          status: "PENDIENTE",
        },
      }),
    ]);

    const payrollByStaff = new Map(payrolls.map((p) => [p.staffMemberId, p]));

    const lines = staff.map((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.trim();
      const existing = payrollByStaff.get(s.id);
      const monthlySalary = s.salary ?? 0;
      const baseSalary = monthlySalary / 2;

      if (existing) {
        return {
          id: existing.id,
          staffMemberId: s.id,
          baseSalary,
          discountsTotal: existing.discountsTotal,
          netSalary: existing.netSalary,
          status: existing.status,
          paymentMethod: existing.paymentMethod,
          transferNumber: existing.transferNumber,
          paidAt: existing.paidAt,
          staffMember: { fullName, jobTitle: s.jobTitle ?? null },
        };
      }

      const discountsTotal = pendingDiscounts
        .filter((d) => d.staffMemberId === s.id)
        .reduce((sum, d) => sum + d.amount, 0);
      const netSalary = Math.max(0, baseSalary - discountsTotal);

      return {
        id: null as string | null,
        staffMemberId: s.id,
        baseSalary,
        discountsTotal,
        netSalary,
        status: "PENDIENTE",
        paymentMethod: null,
        transferNumber: null,
        paidAt: null,
        staffMember: { fullName, jobTitle: s.jobTitle ?? null },
      };
    });

    return NextResponse.json({
      ...period,
      payrolls: lines,
    });
  } catch (error: unknown) {
    logger.error("Error fetching payroll period:", error);
    const msg =
      error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P1001"
        ? "No se puede conectar con la base de datos. Verifica tu conexión e intenta de nuevo."
        : "Error al obtener período";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
