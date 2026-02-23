"use client";

import * as React from "react";
import { formatWithThousands, parseFormattedNumber } from "@/lib/formatNumber";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (rawValue: string) => void;
  /** Sufijo visual (ej: "%") mostrado al lado del valor cuando hay contenido */
  suffix?: string;
};

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, onFocus, onBlur, suffix, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const rawValue = value ?? "";

    const displayValue = focused
      ? rawValue
      : rawValue
        ? formatWithThousands(rawValue)
        : "";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFormattedNumber(e.target.value);
      onChange(raw);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <div className={cn("relative w-full", suffix && "flex items-center")}>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(className, suffix && "pr-8")}
          {...props}
        />
        {suffix && rawValue && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
NumericInput.displayName = "NumericInput";
