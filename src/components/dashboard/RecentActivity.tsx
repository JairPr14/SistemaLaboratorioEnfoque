import { formatTimeAgo } from "@/lib/time-utils";

type ActivityItem = {
  id: string;
  text: string;
  createdAt: string;
};

type Props = {
  items: ActivityItem[];
};

export function RecentActivity({ items }: Props) {
  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <span className="text-slate-700 dark:text-slate-200">{item.text}</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-400">
            {formatTimeAgo(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
