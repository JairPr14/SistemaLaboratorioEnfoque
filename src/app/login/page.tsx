"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email o contraseña incorrectos");
        return;
      }
      if (!res?.ok) {
        toast.error("No se pudo iniciar sesión. Revisa NEXTAUTH_URL y NEXTAUTH_SECRET en Vercel.");
        return;
      }
      // Redirección completa para que el middleware reciba la cookie de sesión
      window.location.href = callbackUrl;
      return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Sistema LIS
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inicia sesión para continuar
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@laboratorio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Iniciar sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400">Cargando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
