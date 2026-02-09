"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  orderId: string;
};

export function OrderStatusActions({ orderId }: Props) {
  const router = useRouter();

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo actualizar el estado.");
        return;
      }

      toast.success("Estado actualizado.");
      router.refresh();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => updateStatus("EN_PROCESO")}>
        Marcar en proceso
      </Button>
      <Button variant="secondary" onClick={() => updateStatus("COMPLETADO")}>
        Marcar completado
      </Button>
      <Button onClick={() => updateStatus("ENTREGADO")}>Marcar entregado</Button>
      <Button variant="destructive" onClick={() => updateStatus("ANULADO")}>
        Anular
      </Button>
    </div>
  );
}
