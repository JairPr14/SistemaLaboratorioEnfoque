"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  admissionId: string;
  status: "PENDIENTE" | "CONVERTIDA" | "CANCELADA";
  convertedOrderId: string | null;
  canConvert: boolean;
  canManage: boolean;
};

export function AdmissionActions({
  admissionId,
  status,
  convertedOrderId,
  canConvert,
  canManage,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function convertToOrder() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admisiones/${admissionId}/convert`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo convertir la pre-orden");
        return;
      }
      toast.success("Pre-orden convertida a orden de laboratorio.");
      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAdmission() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admisiones/${admissionId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo cancelar la pre-orden");
        return;
      }
      toast.success("Pre-orden cancelada.");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {convertedOrderId && (
        <Link
          href={`/orders/${convertedOrderId}`}
          className="text-sm text-slate-600 hover:underline dark:text-slate-300"
        >
          Ver orden
        </Link>
      )}
      {status === "PENDIENTE" && canConvert && (
        <Button
          type="button"
          size="sm"
          onClick={() => void convertToOrder()}
          disabled={busy}
          className="h-8"
        >
          Convertir
        </Button>
      )}
      {status === "PENDIENTE" && canManage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void cancelAdmission()}
          disabled={busy}
          className="h-8"
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}
