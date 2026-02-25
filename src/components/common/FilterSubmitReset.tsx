import Link from "next/link";
import { Filter, X } from "lucide-react";

type Props = {
  showReset: boolean;
  resetHref: string;
  submitLabel?: string;
  resetLabel?: string;
  submitClassName?: string;
  resetClassName?: string;
  wrapperClassName?: string;
};

export function FilterSubmitReset({
  showReset,
  resetHref,
  submitLabel = "Filtrar",
  resetLabel = "Limpiar",
  submitClassName,
  resetClassName,
  wrapperClassName,
}: Props) {
  return (
    <div className={wrapperClassName ?? "flex items-end gap-2"}>
      <button
        type="submit"
        className={
          submitClassName ??
          "flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
        }
      >
        <Filter className="h-4 w-4" />
        {submitLabel}
      </button>
      {showReset && (
        <Link
          href={resetHref}
          className={
            resetClassName ??
            "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          }
        >
          <X className="h-4 w-4" />
          {resetLabel}
        </Link>
      )}
    </div>
  );
}
