"use client";

import { cn } from "@/lib/utils";

/** Clases reutilizables para estructura de páginas (evita duplicar estilos). */
export const pageLayoutClasses = {
  /** Contenedor principal de una página del app (flex, spacing, min-width para evitar overflow). */
  wrapper: "space-y-6 min-w-0",
  /** Encabezado de página con título y opcional descripción + acciones a la derecha. */
  headerRow: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
  /** Título h1 de página (siempre con soporte dark). */
  title:
    "text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 border-l-4 border-teal-500 pl-3",
  /** Descripción bajo el título. */
  description: "text-slate-500 mt-1 dark:text-slate-400",
  /** Título de sección h2 dentro de una página. */
  sectionTitle: "text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3",
} as const;

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Contenido a la derecha (ej. filtros, botones). */
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(pageLayoutClasses.headerRow, className)}>
      <div>
        <h1 className={pageLayoutClasses.title}>{title}</h1>
        {description && <p className={pageLayoutClasses.description}>{description}</p>}
      </div>
      {actions}
    </div>
  );
}
