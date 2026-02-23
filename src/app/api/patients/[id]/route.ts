import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/features/lab/schemas";
import {
  requirePermission,
  PERMISSION_EDITAR_PACIENTES,
  PERMISSION_ELIMINAR_REGISTROS,
  getServerSession,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Error al obtener paciente" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_EDITAR_PACIENTES);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = patientSchema.parse(payload);
    const { code: _code, ...rest } = parsed;
    const firstName = rest.firstName.trim().toUpperCase();
    const lastName = rest.lastName.trim().toUpperCase();

    const { createdAt: createdAtStr, ...restWithoutCreatedAt } = rest;
    const updateData: Record<string, unknown> = {
      ...restWithoutCreatedAt,
      firstName,
      lastName,
      birthDate: new Date(rest.birthDate),
      phone: rest.phone || null,
      address: rest.address || null,
      email: rest.email || null,
    };
    if (createdAtStr && createdAtStr.trim()) {
      updateData.createdAt = new Date(createdAtStr);
    }
    const item = await prisma.patient.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.patient.update>[0]["data"],
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error updating patient:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al actualizar paciente" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_ELIMINAR_REGISTROS);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const item = await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error deleting patient:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Error al eliminar paciente" },
      { status: 500 },
    );
  }
}
