"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

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

type LabSummary = {
  referredLabId: string;
  referredLabName: string;
  totalCost: number;
  paid: number;
  balance: number;
};

type Props = {
  orderId: string;
  orderCode: string;
  canRegisterPayment: boolean;
  onPaymentSaved?: () => void;
};

export function ReferredLabPaymentDialog({
  orderId,
  orderCode,
  canRegisterPayment,
  onPaymentSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<{
    totalExternalCost: number;
    totalPaidToLabs: number;
    totalBalanceOwed: number;
    labs: LabSummary[];
    payments: Array<{
      id: string;
      referredLabName: string;
      amount: number;
      paidAt: string;
      notes: string | null;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/referred-lab-payments`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.labs) {
        setData(json);
        if (json.labs.length > 0 && !selectedLabId) {
          const firstWithBalance = json.labs.find((l: LabSummary) => l.balance > 0);
          setSelectedLabId(firstWithBalance?.referredLabId ?? json.labs[0].referredLabId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadData();
  }, [open, orderId]);

  const selectedLab = data?.labs.find((l) => l.referredLabId === selectedLabId);
  const maxAmount = selectedLab?.balance ?? 0;

  const submit = async () => {
    if (!selectedLabId) {
      toast.error("Selecciona un laboratorio");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (parsedAmount > maxAmount + 0.0001) {
      toast.error(`El monto excede lo pendiente (${formatCurrency(maxAmount)})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/referred-lab-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referredLabId: selectedLabId,
          amount: parsedAmount,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo registrar el pago");
        return;
      }
      toast.success("Pago al laboratorio referido registrado");
      setAmount("");
      setNotes("");
      await loadData();
      onPaymentSaved?.();
      if (selectedLab && parsedAmount >= selectedLab.balance - 0.0001) {
        setOpen(false);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (!canRegisterPayment) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          Pagar lab. referido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar laboratorio referido</DialogTitle>
          <DialogDescription>
            Orden {orderCode}. Registra los montos que pagas a los laboratorios terciarizados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : !data || data.labs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Esta orden no tiene análisis referidos.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Costo total a labs referidos
              </p>
              <p className="text-lg font-semibold">{formatCurrency(data.totalExternalCost)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Pagado: {formatCurrency(data.totalPaidToLabs)} • Pendiente:{" "}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.totalBalanceOwed)}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referred-lab-select">Laboratorio</Label>
              <select
                id="referred-lab-select"
                value={selectedLabId}
                onChange={(e) => {
                  setSelectedLabId(e.target.value);
                  setAmount("");
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {data.labs.map((l) => (
                  <option key={l.referredLabId} value={l.referredLabId}>
                    {l.referredLabName} — Pendiente: {formatCurrency(l.balance)}
                  </option>
                ))}
              </select>
            </div>

            {selectedLab && selectedLab.balance > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="referred-amount">Monto a registrar</Label>
                  <Input
                    id="referred-amount"
                    inputMode="decimal"
                    placeholder={`Máx. ${formatCurrency(selectedLab.balance)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Pendiente por pagar a este lab: {formatCurrency(selectedLab.balance)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referred-notes">Nota (opcional)</Label>
                  <Input
                    id="referred-notes"
                    placeholder="Ej: Transferencia #123"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => void submit()}
                    disabled={saving || !amount || Number(amount) <= 0}
                  >
                    {saving ? "Guardando…" : "Registrar pago"}
                  </Button>
                </div>
              </>
            )}

            {data.payments.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Pagos registrados
                </p>
                {data.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded border border-slate-200 py-2 px-3 text-sm dark:border-slate-700"
                  >
                    <div>
                      <p className="font-medium">{p.referredLabName}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(p.amount)}</p>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(p.paidAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
