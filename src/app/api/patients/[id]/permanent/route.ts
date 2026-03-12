import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSION_ELIMINAR_REGISTROS } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_ELIMINAR_REGISTROS);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const validId = id?.trim();
    if (!validId) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 });
    }

    const ordersCount = await prisma.labOrder.count({
      where: { patientId: validId },
    });
    if (ordersCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar definitivamente: el paciente tiene órdenes asociadas." },
        { status: 400 }
      );
    }

    await prisma.patient.delete({
      where: { id: validId },
    });

    revalidatePath("/patients");
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2025" || err?.message?.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    if (err?.code === "P2003") {
      return NextResponse.json(
        { error: "No se puede eliminar: el paciente tiene registros asociados." },
        { status: 400 }
      );
    }
    logger.error("[api/patients/[id]/permanent] DELETE:", error);
    return NextResponse.json(
      { error: "Error al eliminar el paciente" },
      { status: 500 }
    );
  }
}
