import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId: id,
        userId: session.user.id,
      },
    },
    create: {
      notificationId: id,
      userId: session.user.id,
    },
    update: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
