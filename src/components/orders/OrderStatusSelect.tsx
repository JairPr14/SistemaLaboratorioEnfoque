"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { ORDER_STATUS_CLASS } from "@/lib/status-styles";
import { cn } from "@/lib/utils";

const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "ANULADO", label: "Anulado" },
];

type Props = {
  orderId: string;
  currentStatus: string;
};

export function OrderStatusSelect({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const colorClass = ORDER_STATUS_CLASS[currentStatus] ?? "bg-slate-100 text-slate-700";

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo actualizar el estado.");
        return;
      }

      if (newStatus === "ENTREGADO") {
        toast.success("Orden marcada como entregada.");
      } else {
        toast.success("Estado actualizado.");
      }
      router.refresh();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentStatus}
        onChange={handleChange}
        className={cn(
          "cursor-pointer appearance-none rounded-md border-0 pr-6 pl-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
          colorClass
        )}
        title="Click para cambiar estado"
        aria-label="Cambiar estado de la orden"
      >
        {ORDER_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 h-3 w-3 opacity-70" aria-hidden />
    </div>
  );
}
