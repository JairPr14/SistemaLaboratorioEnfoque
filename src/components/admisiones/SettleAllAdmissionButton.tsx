"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

type Props = {
  orderIds: string[];
  totalAmount: number;
  /** Etiqueta opcional del período, ej. "del 11/02/2026" */
  periodLabel?: string;
};

export function SettleAllAdmissionButton({
  orderIds,
  totalAmount,
  periodLabel,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSettleAll = async () => {
    if (orderIds.length === 0) return;
    const msg = periodLabel
      ? `¿Cobrar todas las ${orderIds.length} órdenes pendientes (${formatCurrency(totalAmount)}) ${periodLabel} a admisión?`
      : `¿Cobrar las ${orderIds.length} órdenes pendientes por un total de ${formatCurrency(totalAmount)} a admisión?`;
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/settle-admission-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo cobrar a admisión");
        return;
      }
      toast.success(`${data.settledCount ?? orderIds.length} orden(es) cobradas a admisión`);
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (orderIds.length === 0) return null;

  return (
    <Button
      type="button"
      onClick={() => void handleSettleAll()}
      disabled={loading}
      className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
    >
      <Wallet className="h-4 w-4" />
      {loading ? "Cobrando…" : `Cobrar todo (${orderIds.length} órdenes – ${formatCurrency(totalAmount)})`}
    </Button>
  );
}
