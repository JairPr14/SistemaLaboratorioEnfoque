import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_GESTIONAR_LAB_REFERIDOS } from "@/lib/auth";

export default async function ReferredLabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const canManage =
    session?.user &&
    (hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_LAB_REFERIDOS));
  if (!canManage) {
    redirect("/configuracion");
  }
  return <>{children}</>;
}
