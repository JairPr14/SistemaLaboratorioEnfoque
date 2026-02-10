"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Gestión de Laboratorio
        </h1>
        <p className="text-sm text-slate-500">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-72">
          <Input placeholder="Buscar paciente, DNI u orden..." />
        </div>
        {session?.user && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="text-sm text-slate-600">
              {session.user.name ?? session.user.email}
            </span>
            <Link
              href="/configuracion"
              title="Configuración"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
