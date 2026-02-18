import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/80 dark:bg-slate-800/95 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-teal-400",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
