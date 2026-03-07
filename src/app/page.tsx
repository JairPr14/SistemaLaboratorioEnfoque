import { redirect } from "next/navigation";
import { getServerSession, isReceptionProfile } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  if (isReceptionProfile(session)) redirect("/orders");
  redirect("/dashboard");
}
