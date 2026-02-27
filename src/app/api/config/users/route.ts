import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission, PERMISSION_GESTIONAR_USUARIOS, PERMISSION_VER_CONFIGURACION } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  const auth = await requireAnyPermission([PERMISSION_VER_CONFIGURACION, PERMISSION_GESTIONAR_USUARIOS]);
  if (auth.response) return auth.response;

  try {
    const users = await prisma.user.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, code: true, name: true } },
      },
    });
    return NextResponse.json({ items: users });
  } catch (error) {
    logger.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(PERMISSION_GESTIONAR_USUARIOS);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { email, password, name, roleId } = body as {
      email?: string;
      password?: string;
      name?: string | null;
      roleId?: string | null;
    };
    const emailTrim = email?.trim()?.toLowerCase();
    if (!emailTrim || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email y contraseña (mín. 6 caracteres) son obligatorios" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({
      where: { email: emailTrim },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 },
      );
    }
    const passwordHash = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: emailTrim,
        passwordHash,
        name: name?.trim() || null,
        roleId: roleId || null,
        isActive: true,
      },
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
    logger.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 },
    );
  }
}
