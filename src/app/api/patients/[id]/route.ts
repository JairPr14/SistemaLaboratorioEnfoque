import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/features/lab/schemas";
import { parseDateTimePeru, parseDatePeru } from "@/lib/date";
import {
  requirePermission,
  getServerSession,
  hasPermission,
  PERMISSION_EDITAR_PACIENTES,
  PERMISSION_ELIMINAR_REGISTROS,
  PERMISSION_VER_PACIENTES,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!hasPermission(session, PERMISSION_VER_PACIENTES)) {
      return NextResponse.json({ error: "Sin permiso para ver pacientes" }, { status: 403 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 });
    }

    const item = await prisma.patient.findFirst({
      where: { id: id.trim(), deletedAt: null },
      select: {
        id: true,
        code: true,
        dni: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        sex: true,
        phone: true,
        address: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Paciente no encontrado o eliminado" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("[api/patients/[id]] GET:", error);
    return NextResponse.json(
      { error: "Error al obtener paciente" },
      { status: 500 },
    );
  }
}

function validateId(id: string | undefined): string | null {
  if (!id || typeof id !== "string" || id.trim().length === 0) return null;
  return id.trim();
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_EDITAR_PACIENTES);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const validId = validateId(id);
    if (!validId) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 });
    }
    const payload = await request.json();
    const parsed = patientSchema.parse(payload);
    const { code: _code, ...rest } = parsed;
    const firstName = rest.firstName.trim().toUpperCase();
    const lastName = rest.lastName.trim().toUpperCase();

    const { createdAt: createdAtStr, ...restWithoutCreatedAt } = rest;
    const birthDateValue = rest.birthDate && String(rest.birthDate).trim()
      ? parseDatePeru(rest.birthDate)
      : rest.ageYears != null && !Number.isNaN(rest.ageYears)
        ? parseDatePeru(`${new Date().getFullYear() - rest.ageYears}-01-01`)
        : parseDatePeru("2000-01-01");

    const updateData: Record<string, unknown> = {
      ...restWithoutCreatedAt,
      firstName,
      lastName,
      birthDate: birthDateValue,
      dni: rest.dni && String(rest.dni).trim() ? String(rest.dni).trim() : null,
      phone: rest.phone || null,
      address: rest.address || null,
      email: rest.email || null,
    };
    if (createdAtStr && createdAtStr.trim()) {
      updateData.createdAt = parseDateTimePeru(createdAtStr);
    }
    const item = await prisma.patient.update({
      where: { id: validId },
      data: updateData as Parameters<typeof prisma.patient.update>[0]["data"],
    });
    revalidatePath("/patients");
    revalidatePath(`/patients/${validId}`);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2025" || err?.message?.includes("Record to update not found")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    logger.error("[api/patients/[id]] PUT:", error);
    return NextResponse.json(
      { error: "Error al actualizar paciente" },
      { status: 500 },
    );
  }
}

export async function PATCH(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_EDITAR_PACIENTES);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const validId = validateId(id);
    if (!validId) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 });
    }
    const item = await prisma.patient.update({
      where: { id: validId },
      data: { deletedAt: null },
    });

    return NextResponse.json({ item });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2025" || err?.message?.includes("Record to update not found")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    logger.error("[api/patients/[id]] PATCH:", error);
    return NextResponse.json(
      { error: "Error al restaurar paciente" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_ELIMINAR_REGISTROS);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const validId = validateId(id);
    if (!validId) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 });
    }
    const item = await prisma.patient.update({
      where: { id: validId },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/patients");
    revalidatePath(`/patients/${validId}`);
    return NextResponse.json({ item });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2025" || err?.message?.includes("Record to update not found")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    logger.error("[api/patients/[id]] DELETE:", error);
    return NextResponse.json(
      { error: "Error al eliminar paciente" },
      { status: 500 },
    );
  }
}
