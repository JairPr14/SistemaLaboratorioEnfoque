"use client";

import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";

const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type PrintActionsProps = {
  patientName: string;
  patientPhone?: string | null;
  analysesNames: string;
  analysisCodes: string;
  date: string;
};

/** Sanitiza texto para usar en nombres de archivo (sin / \\ : * ? " < > |) */
function sanitizeFilename(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

export function PrintActions({ patientName, patientPhone, analysesNames, analysisCodes, date }: PrintActionsProps) {
  const openPrintDialog = () => {
    const baseTitle = document.title;
    const safeDate = date.replace(/\//g, "-");
    const pdfTitle = `${sanitizeFilename(patientName)} - ${sanitizeFilename(analysisCodes)} - ${safeDate}`;
    document.title = pdfTitle;
    const onAfterPrint = () => {
      document.title = baseTitle;
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  };

  const handleWhatsApp = () => {
    const message = `Estimado *${patientName}*, somos de Clínica Enfoque Salud, adjuntamos sus resultados:\n*${analysesNames}*, *${date}* adjunto pdf:`;
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
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-white/95 px-4 py-3 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm font-medium text-slate-700">Vista de impresión</span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="default" onClick={openPrintDialog}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button type="button" variant="outline" onClick={openPrintDialog}>
            <FileDown className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleWhatsApp}
            className="text-green-700 border-green-600 hover:bg-green-50 hover:text-green-800"
          >
            {WHATSAPP_SVG}
            <span className="ml-2">Enviar por WhatsApp</span>
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        &quot;Descargar e Imprimir&quot; descarga el PDF y lo imprime. &quot;Enviar por WhatsApp&quot; abre WhatsApp con el número del paciente y el mensaje predefinido.
      </p>
    </div>
  );
}
