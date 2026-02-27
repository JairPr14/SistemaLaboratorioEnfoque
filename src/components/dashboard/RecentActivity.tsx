import Link from "next/link";
import { formatTimeAgo } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type ActivityItem = {
  id: string;
  orderId: string;
  /** Texto con nombre del paciente, ej. "Se entregó a Juan Pérez" */
  text: string;
  createdAt: string;
};

type Props = {
  items: ActivityItem[];
};

export function RecentActivity({ items }: Props) {
  return (
    <ul className="space-y-1">
      {items.slice(0, 8).map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
            {item.text}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-400">
              {formatTimeAgo(item.createdAt)}
            </span>
            <Link href={`/orders/${item.orderId}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2" title="Ver análisis / orden">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
