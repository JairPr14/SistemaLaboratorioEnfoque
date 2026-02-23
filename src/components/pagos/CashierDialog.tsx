"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

type PendingOrder = {
  id: string;
  label: string;
  sublabel: string;
  total: number;
  paid: number;
  balance: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function CashierDialog({ open, onOpenChange, onSuccess }: Props) {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [cashOrderCode, setCashOrderCode] = useState("");
  const [cashOrderMatches, setCashOrderMatches] = useState<
    Array<{ id: string; label: string; sublabel?: string }>
  >([]);
  const [cashOrderId, setCashOrderId] = useState<string | null>(null);
  const [cashOrderTotal, setCashOrderTotal] = useState(0);
  const [cashOrderPaid, setCashOrderPaid] = useState(0);
  const [cashOrderPatient, setCashOrderPatient] = useState<{ name: string; dni: string } | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState("EFECTIVO");
  const [cashNotes, setCashNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPendingLoading(true);
    fetch("/api/orders/pending-payments")
      .then((res) => res.json().catch(() => ({})))
      .then((data) => setPendingOrders((data.orders ?? []) as PendingOrder[]))
      .catch(() => setPendingOrders([]))
      .finally(() => setPendingLoading(false));
  }, [open]);

  const loadOrderForPayment = async (orderId: string) => {
    setLoading(true);
    try {
      const paymentRes = await fetch(`/api/orders/${orderId}/payments`);
      const paymentData = await paymentRes.json().catch(() => ({}));
      if (!paymentRes.ok) {
        toast.error(paymentData.error ?? "No se pudo cargar la orden");
        return;
      }
      const total = Number(paymentData.summary?.total ?? 0);
      const paid = Number(paymentData.summary?.paid ?? 0);
      const balance = Math.max(0, total - paid);
      if (balance <= 0) {
        toast.error("Esta orden ya está completamente pagada");
        setCashOrderId(null);
        setCashOrderPatient(null);
        return;
      }
      setCashOrderId(orderId);
      setCashOrderTotal(Number(paymentData.summary?.total ?? 0));
      setCashOrderPaid(Number(paymentData.summary?.paid ?? 0));
      const label = paymentData.item?.patientLabel ?? "";
      const dni = paymentData.item?.patientDni ?? "";
      setCashOrderPatient(label || dni ? { name: label, dni } : null);
      toast.success("Orden cargada para cobro");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const loadCashOrder = async () => {
    const q = cashOrderCode.trim();
    if (!q) {
      toast.error("Ingresa código de orden, nombre o DNI del paciente");
      return;
    }
    setLoading(true);
    setCashOrderMatches([]);
    setCashOrderId(null);
    setCashOrderPatient(null);
    try {
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(q)}&onlyPending=1`);
      const searchData = await searchRes.json().catch(() => ({}));
      const orders = (searchData.orders ?? []) as Array<{ id: string; label: string; sublabel?: string }>;
      if (orders.length === 0) {
        toast.error("No se encontraron órdenes con ese criterio");
        return;
      }
      setCashOrderMatches(orders);
      if (orders.length === 1) {
        await loadOrderForPayment(orders[0].id);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const registerCashPayment = async () => {
    if (!cashOrderId) {
      toast.error("Primero busca una orden");
      return;
    }
    const balance = Math.max(0, cashOrderTotal - cashOrderPaid);
    if (balance <= 0) {
      toast.error("Esta orden ya está completamente pagada");
      return;
    }
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (amount > balance + 0.0001) {
      toast.error("El monto excede el saldo pendiente");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${cashOrderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: cashMethod,
          notes: cashNotes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo registrar el pago");
        return;
      }

      setCashOrderPaid(Number(data.summary?.paid ?? cashOrderPaid));
      setCashAmount("");
      setCashNotes("");
      toast.success("Pago registrado");
      router.refresh();
      onSuccess?.();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrar / Registrar pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cobros pendientes</Label>
            {pendingLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
            ) : pendingOrders.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay cobros pendientes</p>
            ) : (
              <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {pendingOrders.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => void loadOrderForPayment(o.id)}
                        disabled={loading}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70 disabled:opacity-50"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {o.label}
                          {o.sublabel ? (
                            <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                              — {o.sublabel}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          Saldo: {formatCurrency(o.balance)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cashierOrderCode">Buscar por orden, nombre o DNI</Label>
            <div className="flex gap-2">
              <Input
                id="cashierOrderCode"
                placeholder="Código, ej: GARCIA, 12345678"
                value={cashOrderCode}
                onChange={(e) => setCashOrderCode(e.target.value)}
              />
              <Button variant="outline" onClick={() => void loadCashOrder()} disabled={loading}>
                Buscar
              </Button>
            </div>
          </div>

          {cashOrderMatches.length > 1 && (
            <div className="space-y-1.5">
              <Label>Varias órdenes encontradas — selecciona una</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) void loadOrderForPayment(id);
                }}
              >
                <option value="">Seleccionar orden...</option>
                {cashOrderMatches.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} {o.sublabel ? `— ${o.sublabel}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cashOrderId && (
            <>
              <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {cashOrderPatient && (
                      <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">
                        Paciente: {cashOrderPatient.name}
                        {cashOrderPatient.dni ? ` — DNI: ${cashOrderPatient.dni}` : ""}
                      </p>
                    )}
                    <p>Total: S/ {cashOrderTotal.toFixed(2)}</p>
                    <p>Cobrado: S/ {cashOrderPaid.toFixed(2)}</p>
                    <p className="font-semibold">Saldo: S/ {(cashOrderTotal - cashOrderPaid).toFixed(2)}</p>
                  </div>
                  <Link
                    href={`/orders/${cashOrderId}/payment-ticket`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                      <Receipt className="h-4 w-4" />
                      Ticket de pago
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cashAmount">Monto</Label>
                  <Input
                    id="cashAmount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cashMethod">Método</Label>
                  <select
                    id="cashMethod"
                    value={cashMethod}
                    onChange={(e) => setCashMethod(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cashNote">Nota (opcional)</Label>
                <Input
                  id="cashNote"
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  placeholder="Observación del pago"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={() => void registerCashPayment()} disabled={loading || !cashOrderId}>
              Registrar pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
