"use client";

import Link from "next/link";

type Props = {
  orderId: string;
  orderCode: string;
  patientName: string;
  patientPhone?: string | null;
};

export function ResultActions({ orderId, orderCode, patientName, patientPhone }: Props) {
  const handleWhatsApp = () => {
    const resultsUrl = `${window.location.origin}/orders/${orderId}/print`;
    const message = `Resultados de laboratorio - Orden ${orderCode} - Paciente: ${patientName}. Ver resultados: ${resultsUrl}`;
    const baseUrl = "https://wa.me";
    const text = encodeURIComponent(message);
    let url: string;
    if (patientPhone && patientPhone.trim()) {
      const digits = patientPhone.replace(/\D/g, "");
      const phone = digits.startsWith("51") ? digits : `51${digits}`;
      url = `${baseUrl}/${phone}?text=${text}`;
    } else {
      url = `${baseUrl}/?text=${text}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link
        href={`/orders/${orderId}`}
        className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
      >
        Ver/Editar
      </Link>
      <Link
        href={`/orders/${orderId}/print`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
      >
        PDF
      </Link>
      <button
        type="button"
        onClick={handleWhatsApp}
        className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
      >
        WhatsApp
      </button>
    </div>
  );
}
