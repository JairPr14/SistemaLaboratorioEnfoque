import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const roles = await prisma.role.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({ items: roles });
  } catch (error) {
    logger.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { code, name, description, isActive, permissions } = body as {
      code: string;
      name: string;
      description?: string | null;
      isActive?: boolean;
      permissions?: string[] | null;
    };

    if (!code || !name) {
      return NextResponse.json(
        { error: "Código y nombre son requeridos" },
        { status: 400 },
      );
    }

    const permissionsJson =
      Array.isArray(permissions) && permissions.every((p) => typeof p === "string")
        ? JSON.stringify(permissions)
        : null;

    const role = await prisma.role.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? true,
        permissions: permissionsJson,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    logger.error("Error creating role:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un rol con ese código" },
          { status: 409 },
        );
      }
    }
    return NextResponse.json(
      { error: "Error al crear el rol" },
      { status: 500 },
    );
  }
}
