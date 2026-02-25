"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt, Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentDialog } from "@/components/orders/PaymentDialog";
import { ReferredLabPaymentDialog } from "@/components/orders/ReferredLabPaymentDialog";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

type PaymentItem = {
  id: string;
  amount: number;
  method: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO";
  notes: string | null;
  paidAt: Date | string;
  createdAt: Date | string;
  user?: { id: string; name: string | null; email: string } | null;
};

type Props = {
  orderId: string;
  orderCode: string;
  orderTotal: number;
  /** Si la orden es de admisión, total a cobrar (precio convenio). Se usa para pre-rellenar el monto al registrar pago. */
  conventionTotal?: number | null;
  canRegisterPayment: boolean;
  canPrintTicket?: boolean;
};

export function OrderPaymentPanel({
  orderId,
  orderCode,
  orderTotal,
  conventionTotal,
  canRegisterPayment,
  canPrintTicket = true,
}: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [referredLabSummary, setReferredLabSummary] = useState<{
    totalExternalCost: number;
    totalPaidToLabs: number;
    totalBalanceOwed: number;
  } | null>(null);

  const reloadReferredLabSummary = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/referred-lab-payments`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.totalExternalCost != null) {
      setReferredLabSummary({
        totalExternalCost: data.totalExternalCost,
        totalPaidToLabs: data.totalPaidToLabs ?? 0,
        totalBalanceOwed: data.totalBalanceOwed ?? 0,
      });
    } else {
      setReferredLabSummary(null);
    }
  }, [orderId]);

  const reloadPayments = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/payments`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.item?.payments) {
      setPayments(data.item.payments);
      return;
    }
    toast.error(data.error ?? "No se pudo cargar los pagos");
  }, [orderId]);

  useEffect(() => {
    const load = () => {
      void reloadPayments();
      void reloadReferredLabSummary();
    };
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [orderId, reloadPayments, reloadReferredLabSummary]);
  const paidTotal = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount), 0),
    [payments],
  );
  const isFromAdmission = conventionTotal != null;
  const effectiveTotal = isFromAdmission ? conventionTotal : orderTotal;
  const balance = Math.max(0, effectiveTotal - paidTotal);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Cobros de la orden</CardTitle>
        <div className="flex items-center gap-2">
          {canPrintTicket && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link
                href={`/orders/${orderId}/payment-ticket`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Receipt className="h-4 w-4" />
                Ticket de pago
              </Link>
            </Button>
          )}
          {canRegisterPayment && (
            <>
              <PaymentDialog
                orderId={orderId}
                orderCode={orderCode}
                orderTotal={orderTotal}
                paidTotal={paidTotal}
                defaultAmount={conventionTotal}
                disabled={balance <= 0}
                onPaymentSaved={async () => {
                  await reloadPayments();
                  router.refresh();
                }}
              />
              {referredLabSummary && referredLabSummary.totalExternalCost > 0 && (
                <ReferredLabPaymentDialog
                  orderId={orderId}
                  orderCode={orderCode}
                  canRegisterPayment={canRegisterPayment}
                  onPaymentSaved={() => {
                    void reloadReferredLabSummary();
                    router.refresh();
                  }}
                />
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isFromAdmission ? (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">A cobrar a admisión (convenio)</p>
              <p className="text-base font-semibold">{formatCurrency(conventionTotal!)}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Lo que cobra el lab a admisión</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total orden</p>
              <p className="text-base font-semibold">{formatCurrency(orderTotal)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isFromAdmission ? "Cobrado (de admisión)" : "Total cobrado"}
            </p>
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paidTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isFromAdmission ? "Saldo pendiente (a cobrar a admisión)" : "Saldo pendiente"}
            </p>
            <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(balance)}
            </p>
          </div>
          {referredLabSummary && referredLabSummary.totalExternalCost > 0 && (
            <>
              <div>
                <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Costo lab. referido
                </p>
                <p className="text-base font-semibold">{formatCurrency(referredLabSummary.totalExternalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pendiente por pagar al lab.</p>
                <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(referredLabSummary.totalBalanceOwed)}
                </p>
              </div>
            </>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aún no hay pagos registrados para esta orden.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatCurrency(Number(payment.amount))}</p>
                  <Badge variant="secondary">{PAYMENT_METHOD_LABELS[payment.method]}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(new Date(payment.paidAt))}
                  {payment.user?.name || payment.user?.email
                    ? ` - Registrado por ${payment.user?.name ?? payment.user?.email}`
                    : ""}
                </p>
                {payment.notes ? (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{payment.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
