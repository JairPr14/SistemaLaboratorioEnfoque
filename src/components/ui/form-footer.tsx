"use client";

import { cn } from "@/lib/utils";

type FormFooterProps = {
  children: React.ReactNode;
  total?: React.ReactNode;
  className?: string;
};

export function FormFooter({ children, total, className }: FormFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between sm:px-8",
        className,
      )}
    >
      {total}
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
