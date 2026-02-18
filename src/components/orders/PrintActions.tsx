"use client";

import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";

export function PrintActions() {
  const openPrintDialog = () => {
    window.print();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-white/95 px-4 py-3 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm font-medium text-slate-700">Vista de impresión</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="default" onClick={openPrintDialog}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button type="button" variant="outline" onClick={openPrintDialog}>
            <FileDown className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        &quot;Descargar e Imprimir&quot; descarga el PDF y lo imprime.
      </p>
    </div>
  );
}
