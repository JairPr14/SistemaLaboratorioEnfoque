/**
 * API unificada: devuelve roles, users, branches y printConfig en una sola petición.
 * Reduce 4 conexiones a 1 en la página de configuración.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { getPrintConfig } from "@/lib/print-config";
import {
  requireAnyPermission,
  PERMISSION_GESTIONAR_ROLES,
  PERMISSION_GESTIONAR_USUARIOS,
  PERMISSION_GESTIONAR_SEDES,
  PERMISSION_VER_CONFIGURACION,
  PERMISSION_GESTIONAR_SELLO,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAnyPermission([
    PERMISSION_VER_CONFIGURACION,
    PERMISSION_GESTIONAR_ROLES,
    PERMISSION_GESTIONAR_USUARIOS,
    PERMISSION_GESTIONAR_SEDES,
    PERMISSION_GESTIONAR_SELLO,
  ]);
  if (auth.response) return auth.response;

  try {
    const [roles, users, branches, printConfig] = await withDbRetry(async () => {
      const rolesRes = await prisma.role.findMany({
        orderBy: { code: "asc" },
        include: { _count: { select: { users: true } } },
      });
      const usersRes = await prisma.user.findMany({
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
      const branchesRes = await prisma.branch.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, code: true, name: true, address: true, phone: true, order: true, isActive: true },
      });
      const print = await getPrintConfig();
      return [rolesRes, usersRes, branchesRes, print] as const;
    });

    const res = NextResponse.json({
      roles,
      users,
      branches,
      printConfig,
    });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    logger.error("Error fetching config bundle:", error);
    return NextResponse.json(
      { error: "Error al cargar la configuración" },
      { status: 500 },
    );
  }
}
