import { AppShell } from "@/components/layout/AppShell";

// Revalidar cada 30s: cache para velocidad + actualización constante
export const revalidate = 30;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
