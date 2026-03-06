import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  hasPermission,
  hasAnyPermission,
  ADMIN_ROLE_CODE,
  PERMISSION_ELIMINAR_REGISTROS,
  PERMISSION_VER_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
} from "./auth-utils";

// Re-exportar todo lo que los Server Components y API routes necesitan
export {
  PERMISSION_REPORTES,
  PERMISSION_EDITAR_PACIENTES,
  PERMISSION_ELIMINAR_REGISTROS,
  PERMISSION_VER_PAGOS,
  PERMISSION_REGISTRAR_PAGOS,
  PERMISSION_IMPRIMIR_TICKET_PAGO,
  PERMISSION_VER_ORDENES,
  PERMISSION_VER_PACIENTES,
  PERMISSION_VER_CATALOGO,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_VALIDAR_RESULTADOS,
  PERMISSION_IMPRIMIR_RESULTADOS,
  PERMISSION_VER_CONFIGURACION,
  PERMISSION_GESTIONAR_ROLES,
  PERMISSION_GESTIONAR_USUARIOS,
  PERMISSION_GESTIONAR_SEDES,
  PERMISSION_GESTIONAR_SECCIONES,
  PERMISSION_GESTIONAR_PREANALITICOS,
  PERMISSION_GESTIONAR_CATALOGO,
  PERMISSION_EDITAR_PRECIO_CATALOGO,
  PERMISSION_GESTIONAR_PLANTILLAS,
  PERMISSION_GESTIONAR_SELLO,
  PERMISSION_GESTIONAR_LAB_REFERIDOS,
  PERMISSION_VER_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
  PERMISSION_COBRO_ADMISION,
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  ADMIN_ROLE_CODE,
  hasPermission,
  hasAnyPermission,
  isAdmissionOnlyProfile,
  isReceptionProfile,
  hasRoleWithPermissions,
  isAdmin,
} from "./auth-utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
          include: { role: { select: { code: true, permissions: true } } },
        });
        if (!user || !user.isActive) return null;
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        let permissions: string[] = [];
        if (user.role?.permissions) {
          try {
            const parsed = JSON.parse(user.role.permissions) as unknown;
            permissions = Array.isArray(parsed) && parsed.every((p) => typeof p === "string") ? parsed : [];
          } catch {
            permissions = [];
          }
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          roleCode: user.role?.code ?? null,
          permissions,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.roleCode = user.roleCode ?? null;
        token.permissions = user.permissions ?? [];
        token.permissionsSyncedAt = now;
        return token;
      }

      // Refresca permisos/rol periódicamente para reflejar cambios sin forzar relogin inmediato.
      if (token.id) {
        const lastSync = typeof token.permissionsSyncedAt === "number" ? token.permissionsSyncedAt : 0;
        const shouldRefresh = now - lastSync >= 5 * 60 * 1000;
        if (shouldRefresh) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              include: { role: { select: { code: true, permissions: true } } },
            });

            if (!dbUser || !dbUser.isActive) {
              token.roleCode = null;
              token.permissions = [];
              token.permissionsSyncedAt = now;
              return token;
            }

            let permissions: string[] = [];
            if (dbUser.role?.permissions) {
              try {
                const parsed = JSON.parse(dbUser.role.permissions) as unknown;
                permissions = Array.isArray(parsed) && parsed.every((p) => typeof p === "string") ? parsed : [];
              } catch {
                permissions = [];
              }
            }

            token.roleCode = dbUser.role?.code ?? null;
            token.permissions = permissions;
            token.permissionsSyncedAt = now;
          } catch {
            // Mantener token actual si falla la actualización (evita cortar sesión por error transitorio).
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.roleCode = (token.roleCode as string | null) ?? null;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
};

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

export async function requirePermission(
  permission: string,
): Promise<{ session: Session; response?: never } | { session?: never; response: NextResponse }> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session?.user) return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (!hasPermission(session, permission)) return { response: NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 }) };
  return { session };
}

export async function requireAnyPermission(
  permissions: string[],
): Promise<{ session: Session; response?: never } | { session?: never; response: NextResponse }> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session?.user) return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (!hasAnyPermission(session, permissions)) return { response: NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 }) };
  return { session };
}

export async function requireAdmin(): Promise<
  { session: Session; response?: never } | { session?: never; response: NextResponse }
> {
  return requirePermission(PERMISSION_ELIMINAR_REGISTROS);
}
