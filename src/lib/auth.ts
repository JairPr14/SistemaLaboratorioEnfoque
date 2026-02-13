import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  trustHost: true, // Necesario en Vercel para que la URL se tome de los headers y no falle con "Invalid URL"
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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.roleCode = user.roleCode ?? null;
        token.permissions = user.permissions ?? [];
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

/** Permisos que se pueden asignar a un rol en Configuración → Roles. */
export const PERMISSION_REPORTES = "REPORTES";
export const PERMISSION_EDITAR_PACIENTES = "EDITAR_PACIENTES";
export const PERMISSION_ELIMINAR_REGISTROS = "ELIMINAR_REGISTROS";

export const ALL_PERMISSIONS = [
  { code: PERMISSION_REPORTES, label: "Ver reportes" },
  { code: PERMISSION_EDITAR_PACIENTES, label: "Modificar datos de pacientes" },
  { code: PERMISSION_ELIMINAR_REGISTROS, label: "Eliminar registros (pacientes, órdenes, ítems)" },
] as const;

/** Código del rol administrador (compatibilidad: si el rol no tiene permisos configurados, ADMIN tiene todos). */
export const ADMIN_ROLE_CODE = "ADMIN";

// Re-exportar getServerSession con authOptions pre-configurado
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

export function hasPermission(
  session: { user?: { roleCode?: string | null; permissions?: string[] } } | null,
  permission: string,
): boolean {
  if (!session?.user) return false;
  const perms = session.user.permissions ?? [];
  if (perms.includes(permission)) return true;
  if (session.user.roleCode === ADMIN_ROLE_CODE && perms.length === 0) return true;
  return false;
}

/** @deprecated Usar hasPermission(session, PERMISSION_*) según el caso. */
export function isAdmin(session: { user?: { roleCode?: string | null; permissions?: string[] } } | null): boolean {
  return (
    hasPermission(session, PERMISSION_REPORTES) &&
    hasPermission(session, PERMISSION_EDITAR_PACIENTES) &&
    hasPermission(session, PERMISSION_ELIMINAR_REGISTROS)
  );
}

/**
 * Para uso en API routes: exige un permiso concreto. Devuelve la sesión o la respuesta 401/403.
 */
export async function requirePermission(
  permission: string,
): Promise<
  { session: Session; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session?.user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (!hasPermission(session, permission)) {
    return { response: NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 }) };
  }
  return { session };
}

/** @deprecated Usar requirePermission(PERMISSION_EDITAR_PACIENTES) o requirePermission(PERMISSION_ELIMINAR_REGISTROS). */
export async function requireAdmin(): Promise<
  { session: Session; response?: never } | { session?: never; response: NextResponse }
> {
  return requirePermission(PERMISSION_ELIMINAR_REGISTROS);
}
