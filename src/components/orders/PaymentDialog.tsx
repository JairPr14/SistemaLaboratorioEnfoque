"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";

type Props = {
  orderId: string;
  orderCode: string;
  orderTotal: number;
  paidTotal: number;
  /** Si la orden es de admisión, monto a cobrar (precio convenio). Se usa para pre-rellenar el campo Monto. */
  defaultAmount?: number | null;
  disabled?: boolean;
  onPaymentSaved?: (summary: { total: number; paid: number; balance: number }) => void;
};

export function PaymentDialog({
  orderId,
  orderCode,
  orderTotal,
  paidTotal,
  defaultAmount,
  disabled = false,
  onPaymentSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHOD_OPTIONS)[number]["value"]>("EFECTIVO");
  const [notes, setNotes] = useState("");

  const balance = useMemo(() => Math.max(0, orderTotal - paidTotal), [orderTotal, paidTotal]);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount != null && defaultAmount > 0 ? String(defaultAmount) : "");
    }
  }, [open, defaultAmount]);

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (parsedAmount > balance + 0.0001) {
      toast.error("El monto excede el saldo pendiente");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          method,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo registrar el pago");
        return;
      }

      toast.success("Pago registrado correctamente");
      setAmount("");
      setNotes("");
      setMethod("EFECTIVO");
      setOpen(false);
      if (data.summary) {
        onPaymentSaved?.(data.summary);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2" disabled={disabled}>
          <CreditCard className="h-4 w-4" />
          Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Orden {orderCode} - Total {formatCurrency(orderTotal)} - Saldo pendiente {formatCurrency(balance)}
            {defaultAmount != null && defaultAmount > 0 && (
              <span className="mt-1 block text-emerald-600 dark:text-emerald-400">
                Orden de admisión: cobrar precio convenio {formatCurrency(defaultAmount)}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="paymentAmount">Monto</Label>
            <Input
              id="paymentAmount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Método</Label>
            <select
              id="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value as (typeof PAYMENT_METHOD_OPTIONS)[number]["value"])}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentNotes">Nota (opcional)</Label>
            <Input
              id="paymentNotes"
              placeholder="Observación del cobro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving || balance <= 0}>
              {saving ? "Guardando..." : "Guardar pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
