import { ORDER_STATUS_CLASS, PAYMENT_STATUS_CLASS } from "@/lib/status-styles";

type Props = {
  type: "order" | "payment";
  value: string;
  label?: string;
  className?: string;
};

export function StatusBadge({ type, value, label, className }: Props) {
  const palette = type === "order" ? ORDER_STATUS_CLASS : PAYMENT_STATUS_CLASS;
  const colorClass = palette[value] ?? "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${colorClass} ${className ?? ""}`}>
      {label ?? value}
    </span>
  );
}
