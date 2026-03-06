import { redirect } from "next/navigation";
import {
  getServerSession,
  hasAnyPermission,
  ADMIN_ROLE_CODE,
  PERMISSION_VER_CONFIGURACION,
  PERMISSION_GESTIONAR_ROLES,
  PERMISSION_GESTIONAR_USUARIOS,
  PERMISSION_GESTIONAR_SEDES,
  PERMISSION_GESTIONAR_SECCIONES,
  PERMISSION_GESTIONAR_PREANALITICOS,
  PERMISSION_GESTIONAR_SELLO,
  PERMISSION_GESTIONAR_CATALOGO,
  PERMISSION_GESTIONAR_LAB_REFERIDOS,
} from "@/lib/auth";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const configPermissions = [
    PERMISSION_VER_CONFIGURACION,
    PERMISSION_GESTIONAR_ROLES,
    PERMISSION_GESTIONAR_USUARIOS,
    PERMISSION_GESTIONAR_SEDES,
    PERMISSION_GESTIONAR_SECCIONES,
    PERMISSION_GESTIONAR_PREANALITICOS,
    PERMISSION_GESTIONAR_SELLO,
    PERMISSION_GESTIONAR_CATALOGO,
    PERMISSION_GESTIONAR_LAB_REFERIDOS,
  ];
  const canAccess =
    session?.user &&
    (session.user.roleCode === ADMIN_ROLE_CODE || hasAnyPermission(session, configPermissions));
  if (!canAccess) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
