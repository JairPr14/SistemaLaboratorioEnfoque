"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Bolt,
  ClipboardList,
  FileCheck2,
  FileSearch,
  PackageCheck,
  Printer,
  Receipt,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_IMPRIMIR_RESULTADOS,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_REGISTRAR_PAGOS,
  PERMISSION_VALIDAR_RESULTADOS,
} from "@/lib/auth";
import { QuickOrderModal } from "@/components/orders/QuickOrderModal";
import { CashierDialog } from "@/components/pagos/CashierDialog";

type Props = {
  sectionOptions: Array<{ value: string; label: string }>;
};

export function QuickActions({ sectionOptions }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [cashierOpen, setCashierOpen] = useState(false);
  const [markDeliveredOpen, setMarkDeliveredOpen] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [analystSection, setAnalystSection] = useState("");
  const [loading, setLoading] = useState(false);

  const canReception = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_RECEPCION);
  const canAnalyst = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_ANALISTA);
  const canDelivery = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_ENTREGA);
  const canCapture = hasPermission(session ?? null, PERMISSION_CAPTURAR_RESULTADOS);
  const canValidate = hasPermission(session ?? null, PERMISSION_VALIDAR_RESULTADOS);
  const canPrint = hasPermission(session ?? null, PERMISSION_IMPRIMIR_RESULTADOS);
  const canRegisterPayment = hasPermission(session ?? null, PERMISSION_REGISTRAR_PAGOS);

  const goNext = async (type: "capture" | "validate") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        today: "1",
      });
      if (analystSection) params.set("section", analystSection);
      const res = await fetch(`/api/queue/next?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo obtener la siguiente orden");
        return;
      }
      if (!data.item?.orderId) {
        toast.info(type === "capture" ? "No hay pendientes por capturar" : "No hay pendientes por validar");
        return;
      }
      if (type === "capture" && data.item.itemId) {
        router.push(`/orders/${data.item.orderId}?captureItem=${data.item.itemId}`);
        return;
      }
      router.push(`/orders/${data.item.orderId}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const markDeliveredByCode = async () => {
    const q = orderCode.trim();
    if (!q) {
      toast.error("Ingresa un código de orden");
      return;
    }
    setLoading(true);
    try {
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const searchData = await searchRes.json().catch(() => ({}));
      const match = (searchData.orders ?? []).find(
        (o: { label?: string; id: string }) => o.label?.toUpperCase() === q.toUpperCase(),
      );
      if (!match?.id) {
        toast.error("No se encontró una orden con ese código");
        return;
      }

      const updateRes = await fetch(`/api/orders/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENTREGADO" }),
      });
      const updateData = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) {
        toast.error(updateData.error ?? "No se pudo marcar como entregado");
        return;
      }
      toast.success("Orden marcada como ENTREGADO");
      setMarkDeliveredOpen(false);
      setOrderCode("");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="mb-2 flex items-center gap-2">
          <Bolt className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Flujo 1 clic</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canReception && (
            <>
              <Button size="sm" className="gap-2" onClick={() => setQuickOrderOpen(true)}>
                <Stethoscope className="h-4 w-4" />
                Nueva orden (rápida)
              </Button>
              {canPrint && (
                <Link href="/orders">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir etiquetas
                  </Button>
                </Link>
              )}
              {canRegisterPayment && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setCashierOpen(true)}
                >
                  <Receipt className="h-4 w-4" />
                  Cobrar / Registrar pago
                </Button>
              )}
            </>
          )}

          {canAnalyst && (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={analystSection}
                  onChange={(e) => setAnalystSection(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  title="Filtrar por sección para acciones de analista"
                >
                  <option value="">Todas las secciones</option>
                  {sectionOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href={`/dashboard?pendingStatus=PENDIENTE&pendingDate=today${analystSection ? `&pendingSection=${encodeURIComponent(analystSection)}` : ""}`}
              >
                <Button size="sm" variant="outline" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Abrir cola de pendientes
                </Button>
              </Link>
              {canCapture && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => void goNext("capture")} disabled={loading}>
                  <FileSearch className="h-4 w-4" />
                  Capturar siguiente
                </Button>
              )}
              {canValidate && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => void goNext("validate")} disabled={loading}>
                  <FileCheck2 className="h-4 w-4" />
                  Validar siguiente
                </Button>
              )}
            </>
          )}

          {canDelivery && (
            <>
              <Link href="/orders?status=COMPLETADO&focusSearch=1">
                <Button size="sm" variant="outline" className="gap-2">
                  <FileSearch className="h-4 w-4" />
                  Buscar para entrega
                </Button>
              </Link>
              {canPrint && (
                <Link href="/orders?status=COMPLETADO">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir resultado
                  </Button>
                </Link>
              )}
              <Button size="sm" className="gap-2" onClick={() => setMarkDeliveredOpen(true)}>
                <PackageCheck className="h-4 w-4" />
                Marcar como ENTREGADO
              </Button>
            </>
          )}
        </div>
      </div>

      <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />

      <CashierDialog
        open={cashierOpen}
        onOpenChange={setCashierOpen}
        onSuccess={() => router.refresh()}
      />

      <Dialog open={markDeliveredOpen} onOpenChange={setMarkDeliveredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar orden como ENTREGADO</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="orderCodeDelivered">Código de orden</Label>
            <Input
              id="orderCodeDelivered"
              placeholder="Ej: ORD-2026-000123"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Se marcará como entregada si la orden existe.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMarkDeliveredOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void markDeliveredByCode()} disabled={loading}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
