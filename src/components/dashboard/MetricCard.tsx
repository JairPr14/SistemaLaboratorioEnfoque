import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  teal:
    "border-l-teal-500 dark:border-l-teal-400 [&_.metric-icon]:text-teal-600 dark:[&_.metric-icon]:text-teal-400",
  blue:
    "border-l-blue-500 dark:border-l-blue-400 [&_.metric-icon]:text-blue-600 dark:[&_.metric-icon]:text-blue-400",
  amber:
    "border-l-amber-500 dark:border-l-amber-400 [&_.metric-icon]:text-amber-600 dark:[&_.metric-icon]:text-amber-400",
  violet:
    "border-l-violet-500 dark:border-l-violet-400 [&_.metric-icon]:text-violet-600 dark:[&_.metric-icon]:text-violet-400",
  emerald:
    "border-l-emerald-500 dark:border-l-emerald-400 [&_.metric-icon]:text-emerald-600 dark:[&_.metric-icon]:text-emerald-400",
  sky:
    "border-l-sky-500 dark:border-l-sky-400 [&_.metric-icon]:text-sky-600 dark:[&_.metric-icon]:text-sky-400",
} as const;

type AccentKey = keyof typeof accentStyles;

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: string;
  icon?: React.ReactNode;
  accent?: AccentKey;
};

export function MetricCard({ title, value, subtitle, delta, icon, accent = "teal" }: Props) {
  return (
    <Card className={cn("border-l-4", accentStyles[accent])}>
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-base font-medium text-slate-600 dark:text-slate-200">
          {title}
        </CardTitle>
        {icon && (
          <div className="metric-icon text-slate-400 dark:text-slate-500 transition-colors">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </span>
          {delta && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {delta}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-300">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
