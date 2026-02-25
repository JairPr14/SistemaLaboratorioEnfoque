import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  fromName?: string;
  toName?: string;
  fromId: string;
  toId: string;
  fromLabel?: string;
  toLabel?: string;
  defaultFrom?: string;
  defaultTo?: string;
  showLabelIcon?: boolean;
  showInputIcon?: boolean;
  fieldClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export function FilterDateRange({
  fromName = "from",
  toName = "to",
  fromId,
  toId,
  fromLabel = "Desde",
  toLabel = "Hasta",
  defaultFrom,
  defaultTo,
  showLabelIcon = true,
  showInputIcon = false,
  fieldClassName,
  labelClassName,
  inputClassName,
}: Props) {
  return (
    <>
      <div className={cn("space-y-1.5", fieldClassName)}>
        <label
          htmlFor={fromId}
          className={cn("flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400", labelClassName)}
        >
          {showLabelIcon && <CalendarDays className="h-3.5 w-3.5" />}
          {fromLabel}
        </label>
        <div className={cn(showInputIcon ? "relative" : "")}>
          {showInputIcon && <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <input
            id={fromId}
            type="date"
            name={fromName}
            defaultValue={defaultFrom}
            className={cn(
              "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500",
              showInputIcon ? "pl-10 pr-3" : "",
              inputClassName,
            )}
          />
        </div>
      </div>

      <div className={cn("space-y-1.5", fieldClassName)}>
        <label
          htmlFor={toId}
          className={cn("flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400", labelClassName)}
        >
          {showLabelIcon && <CalendarDays className="h-3.5 w-3.5" />}
          {toLabel}
        </label>
        <div className={cn(showInputIcon ? "relative" : "")}>
          {showInputIcon && <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <input
            id={toId}
            type="date"
            name={toName}
            defaultValue={defaultTo}
            className={cn(
              "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500",
              showInputIcon ? "pl-10 pr-3" : "",
              inputClassName,
            )}
          />
        </div>
      </div>
    </>
  );
}
