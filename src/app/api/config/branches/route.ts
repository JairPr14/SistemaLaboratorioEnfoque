import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, PERMISSION_GESTIONAR_SEDES, ADMIN_ROLE_CODE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json({ error: "Error al obtener sedes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const canManage = hasPermission(session, PERMISSION_GESTIONAR_SEDES) || session?.user?.roleCode === ADMIN_ROLE_CODE;
    if (!session?.user || !canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, address, phone, order, isActive } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "El código y nombre son requeridos" },
        { status: 400 }
      );
    }

    const existing = await prisma.branch.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una sede con ese código" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.create({
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
    console.error("Error creating branch:", error);
    return NextResponse.json({ error: "Error al crear sede" }, { status: 500 });
  }
}
