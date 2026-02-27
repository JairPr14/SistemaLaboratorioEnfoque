import { NextResponse } from "next/server";

import { getServerSession, hasPermission, PERMISSION_GESTIONAR_SEDES, ADMIN_ROLE_CODE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch (error) {
    console.error("Error fetching branch:", error);
    return NextResponse.json({ error: "Error al obtener sede" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    const canManage = hasPermission(session, PERMISSION_GESTIONAR_SEDES) || session?.user?.roleCode === ADMIN_ROLE_CODE;
    if (!session?.user || !canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { code, name, address, phone, order, isActive } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "El código y nombre son requeridos" },
        { status: 400 }
      );
    }

    const existing = await prisma.branch.findFirst({
      where: { code, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe otra sede con ese código" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        code: code.toUpperCase(),
        name,
        address: address || null,
        phone: phone || null,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error("Error updating branch:", error);
    return NextResponse.json({ error: "Error al actualizar sede" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    const canManage = hasPermission(session, PERMISSION_GESTIONAR_SEDES) || session?.user?.roleCode === ADMIN_ROLE_CODE;
    if (!session?.user || !canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await context.params;

    // Verificar si hay órdenes usando esta sede
    const ordersCount = await prisma.labOrder.count({ where: { branchId: id } });
    if (ordersCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${ordersCount} órdenes asociadas a esta sede` },
        { status: 400 }
      );
    }

    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return NextResponse.json({ error: "Error al eliminar sede" }, { status: 500 });
  }
}
