"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentDialog } from "@/components/orders/PaymentDialog";

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
  canRegisterPayment: boolean;
  canPrintTicket?: boolean;
};

const methodLabel: Record<PaymentItem["method"], string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
};

export function OrderPaymentPanel({
  orderId,
  orderCode,
  orderTotal,
  canRegisterPayment,
  canPrintTicket = true,
}: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const reloadPayments = async () => {
    const res = await fetch(`/api/orders/${orderId}/payments`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.item?.payments) {
      setPayments(data.item.payments);
      return;
    }
    toast.error(data.error ?? "No se pudo cargar los pagos");
  };

  useEffect(() => {
    void reloadPayments();
  }, [orderId]);
  const paidTotal = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount), 0),
    [payments],
  );
  const balance = Math.max(0, orderTotal - paidTotal);

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
          <PaymentDialog
            orderId={orderId}
            orderCode={orderCode}
            orderTotal={orderTotal}
            paidTotal={paidTotal}
            disabled={balance <= 0}
            onPaymentSaved={async () => {
              await reloadPayments();
              router.refresh();
            }}
          />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total orden</p>
            <p className="text-base font-semibold">{formatCurrency(orderTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total cobrado</p>
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paidTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo pendiente</p>
            <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(balance)}
            </p>
          </div>
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
                  <Badge variant="secondary">{methodLabel[payment.method]}</Badge>
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
