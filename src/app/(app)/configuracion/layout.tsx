import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_VER_CONFIGURACION, ADMIN_ROLE_CODE } from "@/lib/auth";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const canAccess =
    session?.user &&
    (session.user.roleCode === ADMIN_ROLE_CODE || hasPermission(session, PERMISSION_VER_CONFIGURACION));
  if (!canAccess) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
