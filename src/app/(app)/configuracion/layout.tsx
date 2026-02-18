import { redirect } from "next/navigation";
import { getServerSession, ADMIN_ROLE_CODE } from "@/lib/auth";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.user || session.user.roleCode !== ADMIN_ROLE_CODE) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
