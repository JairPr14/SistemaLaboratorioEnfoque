import { NextResponse } from "next/server";
import { getServerSession, ADMIN_ROLE_CODE } from "@/lib/auth";

async function ensureAdmin() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.roleCode !== ADMIN_ROLE_CODE) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  return null;
}

/** BonusType no existe en el schema actual; retorna lista vacía */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  return NextResponse.json({ items: [] });
}
