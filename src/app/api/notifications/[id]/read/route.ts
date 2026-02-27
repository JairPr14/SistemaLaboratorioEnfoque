import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    return NextResponse.json(
      { error: "Sesión inválida: usuario no encontrado. Inicia sesión de nuevo." },
      { status: 401 },
    );
  }

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
