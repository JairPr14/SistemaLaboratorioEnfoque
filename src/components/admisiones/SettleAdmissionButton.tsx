"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  orderId: string;
  orderCode: string;
};

export function SettleAdmissionButton({ orderId, orderCode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSettle = async () => {
    if (!confirm(`¿Marcar orden ${orderCode} como cobrada/saldada por admisión?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionSettledAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo marcar como saldada");
        return;
      }
      toast.success("Orden marcada como cobrada a admisión");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleSettle()}
      disabled={loading}
      className="gap-1.5"
    >
      <CheckCircle className="h-3.5 w-3.5" />
      {loading ? "Guardando…" : "Marcar saldada"}
    </Button>
  );
}
