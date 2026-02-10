"use client";

import Link from "next/link";
import { UserPlus, FilePlus, ClipboardList, FileDown, Package } from "lucide-react";

const actions = [
  { href: "/orders/new", label: "Crear orden", icon: FilePlus },
  { href: "/patients", label: "Registrar paciente", icon: UserPlus },
  { href: "/results", label: "Capturar resultados", icon: ClipboardList },
  { href: "/orders", label: "Generar PDF", icon: FileDown, note: "Ver órdenes" },
  { href: "/delivered", label: "Marcar entregado", icon: Package },
] as const;

export function QuickActionsBar() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
        >
          <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          {label}
        </Link>
      ))}
    </div>
  );
}
