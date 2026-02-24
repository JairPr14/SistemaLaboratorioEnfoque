import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authOptions, hasPermission, PERMISSION_PURGE_ADMISION, ADMIN_ROLE_CODE } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Elimina permanentemente una pre-orden de admisión. Requiere permiso PURGE_ADMISION o rol ADMIN. */
export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const canPurge =
    session.user.roleCode === ADMIN_ROLE_CODE || hasPermission(session, PERMISSION_PURGE_ADMISION);
  if (!canPurge) {
    return NextResponse.json(
      { error: "Sin permiso para eliminar pre-órdenes de admisión" },
      { status: 403 },
    );
  }

  const { id } = await params;
  try {
    const current = await prisma.admissionRequest.findUnique({
      where: { id },
      include: { convertedOrder: { select: { id: true, orderCode: true } } },
    });
    if (!current) return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (current.convertedOrderId) {
        await tx.labOrder.update({
          where: { id: current.convertedOrderId },
          data: { admissionRequestId: null },
        });
      }
      await tx.admissionRequest.delete({ where: { id } });
    });

    logger.info("Admission request purged by admin", {
      admissionId: id,
      requestCode: current.requestCode,
      status: current.status,
      byUserId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error purging admission:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la pre-orden" },
      { status: 500 },
    );
  }
}
