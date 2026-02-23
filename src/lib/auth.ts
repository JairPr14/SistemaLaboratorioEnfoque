import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
export const PERMISSION_VER_PAGOS = "VER_PAGOS";
export const PERMISSION_REGISTRAR_PAGOS = "REGISTRAR_PAGOS";
export const PERMISSION_IMPRIMIR_TICKET_PAGO = "IMPRIMIR_TICKET_PAGO";
export const PERMISSION_VER_ORDENES = "VER_ORDENES";
export const PERMISSION_VER_PACIENTES = "VER_PACIENTES";
export const PERMISSION_VER_CATALOGO = "VER_CATALOGO";
export const PERMISSION_QUICK_ACTIONS_RECEPCION = "QUICK_ACTIONS_RECEPCION";
export const PERMISSION_QUICK_ACTIONS_ANALISTA = "QUICK_ACTIONS_ANALISTA";
export const PERMISSION_QUICK_ACTIONS_ENTREGA = "QUICK_ACTIONS_ENTREGA";
export const PERMISSION_CAPTURAR_RESULTADOS = "CAPTURAR_RESULTADOS";
export const PERMISSION_VALIDAR_RESULTADOS = "VALIDAR_RESULTADOS";
export const PERMISSION_IMPRIMIR_RESULTADOS = "IMPRIMIR_RESULTADOS";

// Permisos de Configuración
export const PERMISSION_VER_CONFIGURACION = "VER_CONFIGURACION";
export const PERMISSION_GESTIONAR_ROLES = "GESTIONAR_ROLES";
export const PERMISSION_GESTIONAR_USUARIOS = "GESTIONAR_USUARIOS";
export const PERMISSION_GESTIONAR_SEDES = "GESTIONAR_SEDES";
export const PERMISSION_GESTIONAR_SECCIONES = "GESTIONAR_SECCIONES";
export const PERMISSION_GESTIONAR_PREANALITICOS = "GESTIONAR_PREANALITICOS";
export const PERMISSION_GESTIONAR_CATALOGO = "GESTIONAR_CATALOGO";
export const PERMISSION_EDITAR_PRECIO_CATALOGO = "EDITAR_PRECIO_CATALOGO";
export const PERMISSION_GESTIONAR_PLANTILLAS = "GESTIONAR_PLANTILLAS";
export const PERMISSION_GESTIONAR_SELLO = "GESTIONAR_SELLO";
export const PERMISSION_VER_ADMISION = "VER_ADMISION";
export const PERMISSION_GESTIONAR_ADMISION = "GESTIONAR_ADMISION";
export const PERMISSION_CONVERTIR_ADMISION_A_ORDEN = "CONVERTIR_ADMISION_A_ORDEN";
export const PERMISSION_AJUSTAR_PRECIO_ADMISION = "AJUSTAR_PRECIO_ADMISION";

/** Permisos agrupados por módulo para la configuración de roles. */
export const PERMISSION_GROUPS = [
  {
    label: "Configuración del Sistema",
    permissions: [
      { code: PERMISSION_VER_CONFIGURACION, label: "Ver panel de configuración" },
      { code: PERMISSION_GESTIONAR_ROLES, label: "Gestionar roles" },
      { code: PERMISSION_GESTIONAR_USUARIOS, label: "Gestionar usuarios" },
      { code: PERMISSION_GESTIONAR_SEDES, label: "Gestionar sedes" },
      { code: PERMISSION_GESTIONAR_SECCIONES, label: "Gestionar secciones de laboratorio" },
      { code: PERMISSION_GESTIONAR_PREANALITICOS, label: "Gestionar notas preanalíticas" },
      { code: PERMISSION_GESTIONAR_SELLO, label: "Gestionar sello virtual de PDFs" },
    ],
  },
  {
    label: "Catálogo y Plantillas",
    permissions: [
      { code: PERMISSION_VER_CATALOGO, label: "Ver catálogo y promociones" },
      { code: PERMISSION_GESTIONAR_CATALOGO, label: "Gestionar catálogo de análisis" },
      { code: PERMISSION_EDITAR_PRECIO_CATALOGO, label: "Editar precio global del catálogo" },
      { code: PERMISSION_GESTIONAR_PLANTILLAS, label: "Gestionar plantillas de resultados" },
    ],
  },
  {
    label: "Admisión",
    permissions: [
      { code: PERMISSION_VER_ADMISION, label: "Ver bandeja de admisión" },
      { code: PERMISSION_GESTIONAR_ADMISION, label: "Crear y gestionar pre-órdenes de admisión" },
      { code: PERMISSION_CONVERTIR_ADMISION_A_ORDEN, label: "Convertir pre-orden de admisión a orden de laboratorio" },
      { code: PERMISSION_AJUSTAR_PRECIO_ADMISION, label: "Ajustar precio puntual en pre-orden de admisión" },
    ],
  },
  {
    label: "Reportes",
    permissions: [
      { code: PERMISSION_REPORTES, label: "Ver reportes" },
    ],
  },
  {
    label: "Pacientes",
    permissions: [
      { code: PERMISSION_VER_PACIENTES, label: "Ver y buscar pacientes" },
      { code: PERMISSION_EDITAR_PACIENTES, label: "Modificar datos de pacientes" },
    ],
  },
  {
    label: "Registros",
    permissions: [
      { code: PERMISSION_ELIMINAR_REGISTROS, label: "Eliminar registros (pacientes, órdenes, ítems)" },
    ],
  },
  {
    label: "Pagos / Cobros",
    permissions: [
      { code: PERMISSION_VER_PAGOS, label: "Ver módulo Pagos (lista, ticket de pago)" },
      { code: PERMISSION_REGISTRAR_PAGOS, label: "Registrar pagos" },
      { code: PERMISSION_IMPRIMIR_TICKET_PAGO, label: "Generar ticket de pago" },
    ],
  },
  {
    label: "Órdenes y Flujo",
    permissions: [
      { code: PERMISSION_VER_ORDENES, label: "Ver órdenes, pendientes y entregados" },
    ],
  },
  {
    label: "Recepción",
    permissions: [
      { code: PERMISSION_QUICK_ACTIONS_RECEPCION, label: "Acciones rápidas de recepción" },
    ],
  },
  {
    label: "Análisis",
    permissions: [
      { code: PERMISSION_QUICK_ACTIONS_ANALISTA, label: "Acciones rápidas de analista" },
      { code: PERMISSION_CAPTURAR_RESULTADOS, label: "Capturar resultados" },
      { code: PERMISSION_VALIDAR_RESULTADOS, label: "Validar resultados" },
    ],
  },
  {
    label: "Entrega",
    permissions: [
      { code: PERMISSION_QUICK_ACTIONS_ENTREGA, label: "Acciones rápidas de entrega" },
    ],
  },
  {
    label: "Resultados",
    permissions: [
      { code: PERMISSION_IMPRIMIR_RESULTADOS, label: "Imprimir resultados" },
    ],
  },
] as const;

/** Lista plana de todos los permisos (compatibilidad). */
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => ({ code: p.code, label: p.label })),
);

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

/** Verifica si el usuario tiene al menos uno de los permisos indicados. */
export function hasAnyPermission(
  session: { user?: { roleCode?: string | null; permissions?: string[] } } | null,
  permissions: string[],
): boolean {
  if (!session?.user || permissions.length === 0) return false;
  return permissions.some((p) => hasPermission(session, p));
}

/** Devuelve true si el usuario tiene rol asignado con permisos (o es ADMIN). */
export function hasRoleWithPermissions(
  session: { user?: { roleCode?: string | null; permissions?: string[] } } | null,
): boolean {
  if (!session?.user) return false;
  if (session.user.roleCode === ADMIN_ROLE_CODE) return true;
  const perms = session.user.permissions ?? [];
  return perms.length > 0;
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
