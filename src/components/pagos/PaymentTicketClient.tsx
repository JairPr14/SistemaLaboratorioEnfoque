"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

type PrintFormat = "a4" | "80mm";

type PaymentItem = {
  amount: number;
  method: string;
  paidAt: Date | string;
};

type Props = {
  orderCode: string;
  patientName: string;
  patientDni: string | null;
  createdAt: Date | string;
  total: number;
  paidTotal: number;
  balance: number;
  paymentStatus: string;
  payments: PaymentItem[];
};

export function PaymentTicketClient({
  orderCode,
  patientName,
  patientDni,
  createdAt,
  total,
  paidTotal,
  balance,
  paymentStatus,
  payments,
}: Props) {
  const router = useRouter();
  const [format, setFormat] = useState<PrintFormat>("a4");

  const handlePrint = () => {
    document.body.classList.add(`print-ticket-${format}`);
    window.print();
  };

  useEffect(() => {
    const onAfterPrint = () => {
      document.body.classList.remove("print-ticket-a4", "print-ticket-80mm");
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-white px-4 py-3 shadow-sm print:hidden dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Label htmlFor="print-format" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Formato:
          </Label>
          <select
            id="print-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as PrintFormat)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="a4">A4</option>
            <option value="80mm">80 mm (térmico)</option>
          </select>
        </div>
        <Button type="button" variant="default" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir ticket
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      <div className="print-ticket-content">
        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-slate-900 print:max-w-none print:border-0 print:shadow-none print-ticket-inner">
          <div className="text-center">
            <h1 className="text-lg font-bold">Clinica Enfoque Salud</h1>
            <p className="text-xs text-slate-500">Laboratorio Clínico</p>
          </div>

          <div className="mt-6 space-y-1 border-b border-slate-200 pb-4">
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">N° Orden:</span>
              <span className="font-mono font-semibold">{orderCode}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">Paciente:</span>
              <span className="font-semibold">{patientName}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">DNI:</span>
              <span className="font-semibold">{patientDni ?? "—"}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">Fecha:</span>
              <span>{formatDate(createdAt)}</span>
            </p>
          </div>

          <div className="mt-4 space-y-1">
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">Total:</span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">Cobrado:</span>
              <span>{formatCurrency(paidTotal)}</span>
            </p>
            <p className="flex justify-between border-t border-slate-200 pt-2 text-sm">
              <span className="text-slate-500">Saldo:</span>
              <span className="font-bold">{formatCurrency(balance)}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-500">Estado cobro:</span>
              <span className="font-medium">{paymentStatus}</span>
            </p>
          </div>

          {payments.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-600">
                Pagos registrados
              </p>
              <ul className="space-y-2">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between text-xs text-slate-700">
                    <span>
                      {formatDateTime(p.paidAt)} — {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
                    </span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            {formatDateTime(new Date())}
          </p>
        </div>
      </div>
    </>
  );
}
