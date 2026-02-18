import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-800/95 dark:shadow-slate-900/20 dark:hover:border-slate-600/80",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pb-2 sm:p-6 sm:pb-2", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<"h3">
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
