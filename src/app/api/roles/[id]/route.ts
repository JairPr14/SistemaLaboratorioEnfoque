import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json(
      { error: "Error al actualizar el rol" },
      { status: 500 },
    );
  }
}
