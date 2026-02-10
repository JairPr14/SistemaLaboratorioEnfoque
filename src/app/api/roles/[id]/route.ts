import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await _request.json();
    const { name, description, isActive } = body as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name != null && { name: String(name).trim() }),
        ...(description !== undefined && { description: description === "" ? null : description }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
    });
    return NextResponse.json(role);
  } catch (error) {
    console.error("Error updating role:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Rol no encontrado" },
          { status: 404 },
        );
      }
    }
    return NextResponse.json(
      { error: "Error al actualizar el rol" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verificar si el rol tiene usuarios asignados
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 },
      );
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol. Tiene ${role._count.users} usuario(s) asignado(s)` },
        { status: 400 },
      );
    }

    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Rol no encontrado" },
          { status: 404 },
        );
      }
    }
    return NextResponse.json(
      { error: "Error al eliminar el rol" },
      { status: 500 },
    );
  }
}
