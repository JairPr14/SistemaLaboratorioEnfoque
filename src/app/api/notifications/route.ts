import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { getServerSession, hasAnyPermission } from "@/lib/auth";
import {
  PERMISSION_VER_ORDENES,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_CAPTURAR_RESULTADOS,
} from "@/lib/auth";

/** Permisos que permiten ver notificaciones de laboratorio (admisión convertida). */
const LAB_PERMISSIONS = [
  PERMISSION_VER_ORDENES,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_CAPTURAR_RESULTADOS,
];

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const canSeeLabNotifications = hasAnyPermission(session, LAB_PERMISSIONS);

  const notifications = await prisma.notification.findMany({
    where: {
      ...(canSeeLabNotifications ? {} : { type: { not: "ADMISSION_CONVERTED" } }),
      reads: {
        none: { userId: session.user.id },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ items: notifications });
}
