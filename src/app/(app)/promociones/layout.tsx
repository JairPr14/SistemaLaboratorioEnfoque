import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_VER_CATALOGO, PERMISSION_GESTIONAR_CATALOGO } from "@/lib/auth";

export default async function PromocionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const canView =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_CATALOGO));
  if (!canView) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
