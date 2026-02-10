"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy } from "lucide-react";

type Props = {
  orderId: string;
};

export function RepeatOrderButton({ orderId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRepeat = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Error al repetir la orden");
        return;
      }
      toast.success(`Orden ${data.code} creada`);
      router.push(`/orders/${data.orderId}`);
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRepeat} disabled={loading}>
      <Copy className="mr-2 h-4 w-4" />
      {loading ? "Creando..." : "Repetir orden"}
    </Button>
  );
}
