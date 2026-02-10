"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResultForm } from "@/components/forms/ResultForm";

type TemplateItem = {
  id: string;
  groupName: string | null;
  paramName: string;
  unit: string | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  valueType: "NUMBER" | "TEXT" | "SELECT";
  selectOptions: string[];
  order: number;
};

type ResultItem = {
  templateItemId: string | null;
  paramNameSnapshot: string;
  unitSnapshot: string | null;
  refTextSnapshot: string | null;
  refMinSnapshot: number | null;
  refMaxSnapshot: number | null;
  value: string;
  isOutOfRange: boolean;
  order: number;
};

type Props = {
  orderId: string;
  itemId: string;
  testName: string;
  testCode: string;
  templateItems: TemplateItem[];
  existing?: {
    reportedBy: string | null;
    comment: string | null;
    items: ResultItem[];
  };
  /** Si se pasa, el diálogo se controla desde fuera (ej. abrir por defecto con ?captureItem=) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function OrderItemResultDialog({
  orderId,
  itemId,
  testName,
  testCode,
  templateItems,
  existing,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;


  const hasItems = templateItems.length > 0 || (existing && existing.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "secondary" : "default"}>
          {existing ? "Ver/Editar resultados" : "Capturar resultados"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {testCode} - {testName}
          </DialogTitle>
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-slate-700">
              {existing ? "📋 Plantilla del paciente (editable)" : "📋 Copiando plantilla estándar para este paciente"}
            </p>
            <p className="text-xs text-slate-500">
              {existing 
                ? "Esta es una copia personalizada de la plantilla para este paciente. Puedes modificarla sin afectar la plantilla original."
                : "Se creará una copia de la plantilla estándar que podrás personalizar solo para este paciente."}
            </p>
          </div>
        </DialogHeader>
        <div className="mt-4">
          {hasItems ? (
            <ResultForm
              orderId={orderId}
              itemId={itemId}
              templateItems={templateItems}
              defaultValues={
                existing
                  ? {
                      reportedBy: existing.reportedBy ?? "",
                      comment: existing.comment ?? "",
                      items: existing.items.map((item) => ({
                        templateItemId: item.templateItemId ?? undefined,
                        paramNameSnapshot: item.paramNameSnapshot,
                        unitSnapshot: item.unitSnapshot ?? undefined,
                        refTextSnapshot: item.refTextSnapshot ?? undefined,
                        refMinSnapshot: item.refMinSnapshot ?? undefined,
                        refMaxSnapshot: item.refMaxSnapshot ?? undefined,
                        value: item.value,
                        isOutOfRange: item.isOutOfRange,
                        order: item.order,
                      })),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p className="mb-2">No hay parámetros en la plantilla.</p>
              <p className="text-sm">
                Puedes agregar parámetros usando el botón &quot;+ Agregar parámetro adicional&quot; una vez abierto el formulario.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
