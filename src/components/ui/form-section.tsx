"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconBg?: "teal" | "cyan" | "emerald" | "amber" | "slate";
  children: React.ReactNode;
  className?: string;
};

const iconBgClasses: Record<NonNullable<FormSectionProps["iconBg"]>, string> = {
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function FormSection({
  title,
  icon: Icon,
  iconBg = "teal",
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("p-6 sm:p-8", className)}>
      <div className="mb-5 flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            iconBgClasses[iconBg],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}
