"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResultForm } from "@/components/forms/ResultForm";

type TemplateItem = {
  id: string;
  groupName: string | null;
  paramName: string;
  unit: string | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  valueType: "NUMBER" | "DECIMAL" | "PERCENTAGE" | "TEXT" | "SELECT";
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "outline" : "default"}>
          {existing ? "Ver/Editar resultados" : "Capturar resultados"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg">
              {testCode} - {testName}
            </DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {existing ? "Resultado en edición" : "Nueva captura"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Registro de resultados por parámetro. Puedes ajustar campos referenciales para este paciente.
          </p>
        </DialogHeader>
        <div className="p-6">
          <ResultForm
            orderId={orderId}
            itemId={itemId}
            templateItems={templateItems}
            onSaved={() => setOpen(false)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
