import { redirect } from "next/navigation";
import { getServerSession, isAdmissionOnlyProfile, isReceptionProfile } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await getServerSession();
    if (session?.user) {
      if (isAdmissionOnlyProfile(session)) redirect("/admission");
      if (isReceptionProfile(session)) redirect("/orders");
    }
    redirect("/dashboard");
  } catch {
    redirect("/login");
  }
}
