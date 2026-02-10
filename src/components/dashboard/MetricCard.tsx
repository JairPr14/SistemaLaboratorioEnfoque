import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: string;
  icon?: React.ReactNode;
};

export function MetricCard({ title, value, subtitle, delta, icon }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-base font-medium text-slate-600 dark:text-slate-200">
          {title}
        </CardTitle>
        {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{value}</span>
          {delta && (
            <span className="text-xs text-emerald-600 font-medium">{delta}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-300">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
