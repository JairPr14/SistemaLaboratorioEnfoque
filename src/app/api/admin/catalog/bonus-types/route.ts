import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, ADMIN_ROLE_CODE } from "@/lib/auth";

async function ensureAdmin() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.roleCode !== ADMIN_ROLE_CODE) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  const items = await prisma.bonusType.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ items });
}
