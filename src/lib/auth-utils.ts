/**
 * Utilidades de permisos y sesión para uso en CLIENTE y SERVIDOR.
 * Sin dependencias de Prisma ni NextAuth server-side.
 * Los componentes "use client" deben importar desde aquí, no desde @/lib/auth.
 */

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
export const PERMISSION_GESTIONAR_LAB_REFERIDOS = "GESTIONAR_LAB_REFERIDOS";

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
      { code: PERMISSION_GESTIONAR_LAB_REFERIDOS, label: "Gestionar laboratorios referidos" },
    ],
  },
  {
    label: "Catálogo y Plantillas",
    permissions: [
      { code: PERMISSION_VER_CATALOGO, label: "Ver catálogo y promociones" },
      { code: PERMISSION_GESTIONAR_CATALOGO, label: "Gestionar catálogo de análisis" },
      { code: PERMISSION_EDITAR_PRECIO_CATALOGO, label: "Editar precio público y convenio del catálogo" },
      { code: PERMISSION_GESTIONAR_PLANTILLAS, label: "Gestionar plantillas de resultados" },
    ],
  },
  { label: "Reportes", permissions: [{ code: PERMISSION_REPORTES, label: "Ver reportes" }] },
  {
    label: "Pacientes",
    permissions: [
      { code: PERMISSION_VER_PACIENTES, label: "Ver y buscar pacientes" },
      { code: PERMISSION_EDITAR_PACIENTES, label: "Modificar datos de pacientes" },
    ],
  },
  {
    label: "Registros",
    permissions: [{ code: PERMISSION_ELIMINAR_REGISTROS, label: "Eliminar registros (pacientes, órdenes, ítems)" }],
  },
  {
    label: "Pagos / Cobros",
    permissions: [
      { code: PERMISSION_VER_PAGOS, label: "Ver módulo Pagos (lista, ticket de pago)" },
      { code: PERMISSION_REGISTRAR_PAGOS, label: "Registrar pagos (cobros directos, pagos a labs externos)" },
      { code: PERMISSION_IMPRIMIR_TICKET_PAGO, label: "Generar ticket de pago" },
    ],
  },
  {
    label: "Órdenes",
    permissions: [{ code: PERMISSION_VER_ORDENES, label: "Ver órdenes, pendientes y entregados" }],
  },
  { label: "Recepción", permissions: [{ code: PERMISSION_QUICK_ACTIONS_RECEPCION, label: "Acciones rápidas de recepción" }] },
  {
    label: "Opciones de Laboratorio",
    permissions: [
      { code: PERMISSION_QUICK_ACTIONS_ANALISTA, label: "Acciones rápidas de analista" },
      { code: PERMISSION_CAPTURAR_RESULTADOS, label: "Capturar resultados" },
      { code: PERMISSION_VALIDAR_RESULTADOS, label: "Validar resultados" },
      { code: PERMISSION_IMPRIMIR_RESULTADOS, label: "Imprimir resultados" },
    ],
  },
  { label: "Entrega", permissions: [{ code: PERMISSION_QUICK_ACTIONS_ENTREGA, label: "Acciones rápidas de entrega" }] },
] as const;

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => ({ code: p.code, label: p.label })),
);

export const ADMIN_ROLE_CODE = "ADMIN";

type SessionLike = { user?: { roleCode?: string | null; permissions?: string[] } } | null;

export function hasPermission(session: SessionLike, permission: string): boolean {
  if (!session?.user) return false;
  const perms = session.user.permissions ?? [];
  if (perms.includes(permission)) return true;
  if (session.user.roleCode === ADMIN_ROLE_CODE && perms.length === 0) return true;
  return false;
}

export function isReceptionProfile(session: SessionLike): boolean {
  if (!session?.user) return false;
  if (session.user.roleCode === ADMIN_ROLE_CODE) return false;
  return hasPermission(session, PERMISSION_QUICK_ACTIONS_RECEPCION) && hasPermission(session, PERMISSION_VER_ORDENES);
}

export function hasAnyPermission(session: SessionLike, permissions: string[]): boolean {
  if (!session?.user || permissions.length === 0) return false;
  return permissions.some((p) => hasPermission(session, p));
}

export function hasRoleWithPermissions(session: SessionLike): boolean {
  if (!session?.user) return false;
  if (session.user.roleCode === ADMIN_ROLE_CODE) return true;
  return (session.user.permissions ?? []).length > 0;
}

export function isAdmin(session: SessionLike): boolean {
  return (
    hasPermission(session, PERMISSION_REPORTES) &&
    hasPermission(session, PERMISSION_EDITAR_PACIENTES) &&
    hasPermission(session, PERMISSION_ELIMINAR_REGISTROS)
  );
}
