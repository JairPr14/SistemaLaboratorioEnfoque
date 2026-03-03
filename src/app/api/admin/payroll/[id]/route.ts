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

/** Marcar planilla como pagada o editar método de pago */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentMethod, transferNumber, status } = body as {
      paymentMethod?: string;
      transferNumber?: string | null;
      status?: string;
    };

    const payroll = await prisma.payroll.findUnique({ where: { id } });
    if (!payroll) return NextResponse.json({ error: "Planilla no encontrada" }, { status: 404 });

    if (status === "PAGADO") {
      const method =
        paymentMethod && PAYROLL_PAYMENT_METHODS.includes(paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
          ? (paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
          : "EFECTIVO";
      const transfer = typeof transferNumber === "string" && transferNumber.trim() ? transferNumber.trim() : null;
      await prisma.payroll.update({
        where: { id },
        data: {
          status: "PAGADO",
          paymentMethod: method,
          transferNumber: method === "TRANSFERENCIA" ? transfer : null,
          paidAt: payroll.paidAt ?? new Date(),
        },
      });
    } else if (status === "BORRADOR" || status === "CALCULADO") {
      await prisma.payroll.update({
        where: { id },
        data: { status: status as "BORRADOR" | "CALCULADO", paymentMethod: null, transferNumber: null, paidAt: null },
      });
    } else if (payroll.status === "PAGADO" && (paymentMethod || transferNumber !== undefined)) {
      // Editar método de pago en planilla ya pagada
      const method =
        paymentMethod && PAYROLL_PAYMENT_METHODS.includes(paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
          ? (paymentMethod as (typeof PAYROLL_PAYMENT_METHODS)[number])
          : payroll.paymentMethod;
      const transfer =
        transferNumber !== undefined
          ? typeof transferNumber === "string" && transferNumber.trim()
            ? transferNumber.trim()
            : null
          : payroll.transferNumber;
      await prisma.payroll.update({
        where: { id },
        data: {
          paymentMethod: method ?? null,
          transferNumber: method === "TRANSFERENCIA" ? transfer : null,
        },
      });
    }

    const updated = await prisma.payroll.findUnique({
      where: { id },
      include: { staffMember: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating payroll:", error);
    return NextResponse.json({ error: "Error al actualizar planilla" }, { status: 500 });
  }
}
