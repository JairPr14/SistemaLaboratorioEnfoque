import { redirect } from "next/navigation";
import { getServerSession, hasPermission, PERMISSION_GESTIONAR_ADMISION, PERMISSION_VER_ADMISION } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdmissionPage() {
  const session = await getServerSession();
  const canManage = hasPermission(session, PERMISSION_GESTIONAR_ADMISION);
  const canView = hasPermission(session, PERMISSION_VER_ADMISION);

  if (!canView && !canManage) {
    redirect("/dashboard");
  }

  // Si puede gestionar (nueva atención), ir a nueva. Si solo puede ver, ir a pacientes del día.
  if (canManage) {
    redirect("/admission/nueva");
  }
  redirect("/admission/pacientes-dia");
}
