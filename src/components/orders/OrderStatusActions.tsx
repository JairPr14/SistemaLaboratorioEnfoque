"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  orderId: string;
  currentStatus: string;
};

export function OrderStatusActions({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const isDelivered = currentStatus === "ENTREGADO";

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

      if (status === "ENTREGADO") {
        toast.success("Orden marcada como entregada. Aparecerá en el área de Entregados.");
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
    <div className="flex flex-wrap items-center gap-2">
      {!isDelivered && (
        <>
          <Button variant="secondary" onClick={() => updateStatus("EN_PROCESO")}>
            Marcar en proceso
          </Button>
          <Button variant="secondary" onClick={() => updateStatus("COMPLETADO")}>
            Marcar completado
          </Button>
          <Button onClick={() => updateStatus("ENTREGADO")}>
            Marcar entregado
          </Button>
          <Button variant="destructive" onClick={() => updateStatus("ANULADO")}>
            Anular
          </Button>
        </>
      )}
      {isDelivered && (
        <Link
          href="/delivered"
          className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Ver en Entregados
        </Link>
      )}
    </div>
  );
}
