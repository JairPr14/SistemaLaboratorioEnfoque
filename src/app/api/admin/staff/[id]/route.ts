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
    const { firstName, lastName, age, jobTitle, phone, address, salary, hireDate, isActive } = body as {
      firstName?: string;
      lastName?: string;
      age?: number | null;
      jobTitle?: string | null;
      phone?: string | null;
      address?: string | null;
      salary?: number | null;
      hireDate?: string | null;
      isActive?: boolean;
    };

    const fn = firstName?.trim();
    const ln = lastName?.trim();
    if (!fn || !ln) return NextResponse.json({ error: "Nombre y apellido son obligatorios" }, { status: 400 });

    const item = await prisma.staffMember.update({
      where: { id },
      data: {
        firstName: fn,
        lastName: ln,
        age: typeof age === "number" && Number.isFinite(age) && age >= 0 ? age : null,
        jobTitle: jobTitle?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        salary: typeof salary === "number" && Number.isFinite(salary) && salary >= 0 ? salary : null,
        hireDate: hireDate ? new Date(hireDate) : null,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    logger.error("Error updating staff:", error);
    return NextResponse.json({ error: "Error al actualizar personal" }, { status: 500 });
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
    await prisma.staffMember.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error deleting staff:", error);
    return NextResponse.json({ error: "Error al eliminar personal" }, { status: 500 });
  }
}
