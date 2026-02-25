"use client";

import type { ReactNode } from "react";

import { TableCell, TableRow } from "@/components/ui/table";

type Props = {
  colSpan: number;
  message: string;
  className?: string;
  icon?: ReactNode;
};

export function EmptyTableRow({ colSpan, message, className, icon }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={className ?? "py-8 text-center text-slate-500 dark:text-slate-400"}>
        {icon}
        <p className="text-slate-500 dark:text-slate-400">{message}</p>
      </TableCell>
    </TableRow>
  );
}
