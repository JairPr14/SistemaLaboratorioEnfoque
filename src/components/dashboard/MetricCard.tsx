import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  teal:
    "border-l-teal-500 dark:border-l-teal-400 [&_.metric-icon]:text-teal-600 dark:[&_.metric-icon]:text-teal-400 hover:shadow-md hover:shadow-teal-500/5 dark:hover:shadow-teal-400/5",
  blue:
    "border-l-blue-500 dark:border-l-blue-400 [&_.metric-icon]:text-blue-600 dark:[&_.metric-icon]:text-blue-400 hover:shadow-md hover:shadow-blue-500/5 dark:hover:shadow-blue-400/5",
  amber:
    "border-l-amber-500 dark:border-l-amber-400 [&_.metric-icon]:text-amber-600 dark:[&_.metric-icon]:text-amber-400 hover:shadow-md hover:shadow-amber-500/5 dark:hover:shadow-amber-400/5",
  violet:
    "border-l-violet-500 dark:border-l-violet-400 [&_.metric-icon]:text-violet-600 dark:[&_.metric-icon]:text-violet-400 hover:shadow-md hover:shadow-violet-500/5 dark:hover:shadow-violet-400/5",
  emerald:
    "border-l-emerald-500 dark:border-l-emerald-400 [&_.metric-icon]:text-emerald-600 dark:[&_.metric-icon]:text-emerald-400 hover:shadow-md hover:shadow-emerald-500/5 dark:hover:shadow-emerald-400/5",
  sky:
    "border-l-sky-500 dark:border-l-sky-400 [&_.metric-icon]:text-sky-600 dark:[&_.metric-icon]:text-sky-400 hover:shadow-md hover:shadow-sky-500/5 dark:hover:shadow-sky-400/5",
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
    <Card
      className={cn(
        "border-l-4 transition-all duration-200",
        accentStyles[accent],
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
        {icon && (
          <div className="metric-icon rounded-lg bg-slate-100 p-2 dark:bg-slate-800/60">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </span>
          {delta && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {delta}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
