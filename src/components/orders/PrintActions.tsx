"use client";

import { Button } from "@/components/ui/button";

export function PrintActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-white/95 px-4 py-3 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-700">Vista de impresión</span>
        <Button type="button" onClick={handlePrint}>
          Descargar PDF
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Si al imprimir aparece la URL o «1/1», en el diálogo elige «Más opciones» y desactiva «Encabezados y pies de página».
      </p>
    </div>
  );
}
