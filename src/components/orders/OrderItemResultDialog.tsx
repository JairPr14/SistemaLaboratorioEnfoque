"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResultForm, type ResultFormHandle } from "@/components/forms/ResultForm";

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
  id?: string;
  templateItemId: string | null;
  paramNameSnapshot: string;
  unitSnapshot: string | null;
  refTextSnapshot: string | null;
  refMinSnapshot: number | null;
  refMaxSnapshot: number | null;
  value: string;
  isOutOfRange: boolean;
  isHighlighted?: boolean;
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
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const resultFormRef = useRef<ResultFormHandle | null>(null);

  const handleSaved = () => {
    // Cerrar directamente sin saveDraft (ya se guardó con el botón Guardar)
    if (isControlled) onOpenChange?.(false);
    else setInternalOpen(false);
    router.refresh();
  };

  const setOpen = (next: boolean) => {
    if (!next) {
      // Al cerrar el modal, guardar borrador primero para que los datos persistan
      const savePromise = resultFormRef.current?.saveDraft();
      if (savePromise) {
        savePromise.finally(() => {
          router.refresh();
          if (isControlled) onOpenChange?.(false);
          else setInternalOpen(false);
        });
        return;
      }
    }
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

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
            key={`${itemId}-${open}-${existing?.items?.length ?? 0}`}
            orderId={orderId}
            itemId={itemId}
            templateItems={templateItems}
            resultFormRef={resultFormRef}
            onSaved={handleSaved}
            onParamAdded={() => router.refresh()}
            defaultValues={
              existing
                ? {
                    reportedBy: existing.reportedBy ?? "",
                    comment: existing.comment ?? "",
                    items: (() => {
                      const usedNullMatches = new Set<number>();
                      return templateItems.map((t) => {
                        let match =
                          t.id.startsWith("orphan-")
                            ? existing.items.find(
                                (ex) => ex.id === t.id.replace(/^orphan-/, "")
                              )
                            : existing.items.find(
                                (ex) => ex.templateItemId === t.id
                              );
                        if (!match && !t.id.startsWith("orphan-")) {
                          const paramKey = `${(t.paramName ?? "").trim()}|${(t.unit ?? "").trim()}`;
                          const idx = existing.items.findIndex(
                            (ex, i) =>
                              !usedNullMatches.has(i) &&
                              ex.templateItemId == null &&
                              `${(ex.paramNameSnapshot ?? "").trim()}|${(ex.unitSnapshot ?? "").trim()}` === paramKey
                          );
                          if (idx >= 0) {
                            match = existing.items[idx];
                            usedNullMatches.add(idx);
                          }
                        }
                        if (match) {
                        return {
                          templateItemId: match.templateItemId ?? t.id,
                          paramNameSnapshot: match.paramNameSnapshot,
                          unitSnapshot: match.unitSnapshot ?? undefined,
                          refTextSnapshot: match.refTextSnapshot ?? undefined,
                          refMinSnapshot: match.refMinSnapshot ?? undefined,
                          refMaxSnapshot: match.refMaxSnapshot ?? undefined,
                          value: match.value,
                          isOutOfRange: match.isOutOfRange,
                          isHighlighted: (match as { isHighlighted?: boolean }).isHighlighted ?? false,
                          order: match.order,
                        };
                      }
                      return {
                        templateItemId: t.id,
                        paramNameSnapshot: t.paramName,
                        unitSnapshot: t.unit ?? undefined,
                        refTextSnapshot: t.refRangeText ?? undefined,
                        refMinSnapshot: t.refMin ?? undefined,
                        refMaxSnapshot: t.refMax ?? undefined,
                        value: "",
                        isOutOfRange: false,
                        isHighlighted: false,
                        order: t.order,
                      };
                    });
                    })(),
                  }
                : undefined
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
