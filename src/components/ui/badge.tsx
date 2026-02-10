import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
        secondary: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
