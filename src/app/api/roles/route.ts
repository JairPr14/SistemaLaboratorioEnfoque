import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({ items: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, description, isActive } = body as {
      code: string;
      name: string;
      description?: string | null;
      isActive?: boolean;
    };

    if (!code || !name) {
      return NextResponse.json(
        { error: "Código y nombre son requeridos" },
        { status: 400 },
      );
    }

    const role = await prisma.role.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
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
