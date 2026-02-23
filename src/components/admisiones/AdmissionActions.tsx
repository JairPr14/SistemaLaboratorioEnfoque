"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  admissionId: string;
  requestCode: string;
  status: "PENDIENTE" | "CONVERTIDA" | "CANCELADA";
  convertedOrderId: string | null;
  canConvert: boolean;
  canManage: boolean;
  isAdmin: boolean;
};

export function AdmissionActions({
  admissionId,
  requestCode,
  status,
  convertedOrderId,
  canConvert,
  canManage,
  isAdmin,
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

  async function purgeAdmission() {
    if (!confirm(`¿Eliminar permanentemente la pre-orden ${requestCode}? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admisiones/${admissionId}/purge`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar la pre-orden");
        return;
      }
      toast.success("Pre-orden eliminada.");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {convertedOrderId && (
        <Link
          href={`/orders/${convertedOrderId}`}
          className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-teal-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
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
      {isAdmin && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void purgeAdmission()}
          disabled={busy}
          className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Eliminar
        </Button>
      )}
    </div>
  );
}
