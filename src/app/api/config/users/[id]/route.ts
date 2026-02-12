import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await _request.json();
    const { roleId, isActive, password } = body as {
      roleId?: string | null;
      isActive?: boolean;
      password?: string;
    };

    // Validar contraseña si se proporciona
    if (password !== undefined && password !== null && password !== "") {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 },
        );
      }
    }

    const updateData: {
      roleId?: string | null;
      isActive?: boolean;
      passwordHash?: string;
    } = {
      ...(roleId !== undefined && { roleId: roleId === "" ? null : roleId }),
      ...(typeof isActive === "boolean" && { isActive }),
    };

    // Solo actualizar la contraseña si se proporciona y no está vacía
    if (password && password.trim().length > 0) {
      updateData.passwordHash = await hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, code: true, name: true } },
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    logger.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 },
    );
  }
}
