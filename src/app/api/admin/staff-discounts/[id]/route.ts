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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, amount, discountTypeId } = body as {
      status?: string;
      amount?: number;
      discountTypeId?: string;
    };

    const existing = await prisma.staffDiscount.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
    if (existing.payrollId) return NextResponse.json({ error: "No se puede modificar un descuento ya aplicado a planilla" }, { status: 400 });

    const updateData: { status?: string; amount?: number; discountTypeId?: string } = {};

    const validStatus = ["PENDIENTE", "ANULADO"];
    if (status && validStatus.includes(status)) {
      updateData.status = status;
    }
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      updateData.amount = amount;
    }
    if (discountTypeId && typeof discountTypeId === "string" && discountTypeId.trim()) {
      const typeExists = await prisma.discountType.findUnique({ where: { id: discountTypeId } });
      if (typeExists) updateData.discountTypeId = discountTypeId;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.staffDiscount.update({ where: { id }, data: updateData });
    }
    const item = await prisma.staffDiscount.findUnique({
      where: { id },
      include: {
        staffMember: { select: { firstName: true, lastName: true } },
        discountType: { select: { name: true } },
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    logger.error("Error updating staff discount:", error);
    return NextResponse.json({ error: "Error al actualizar descuento" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const existing = await prisma.staffDiscount.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
    if (existing.payrollId) return NextResponse.json({ error: "No se puede eliminar un descuento ya aplicado a planilla" }, { status: 400 });
    await prisma.staffDiscount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error deleting staff discount:", error);
    return NextResponse.json({ error: "Error al eliminar descuento" }, { status: 500 });
  }
}
