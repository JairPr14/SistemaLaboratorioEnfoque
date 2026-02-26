"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatCurrency } from "@/lib/format";
import { parseSelectOptions } from "@/lib/json-helpers";
import { getTemplateItemsForPatient } from "@/lib/template-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderItemResultDialog } from "@/components/orders/OrderItemResultDialog";
import { AddAnalysisToOrderDialog } from "@/components/orders/AddAnalysisToOrderDialog";
import { DeleteButton } from "@/components/common/DeleteButton";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  status: string;
  priceSnapshot: number | { toString(): string };
  referredLabId?: string | null;
  templateSnapshot: unknown;
  promotionId?: string | null;
  promotionName?: string | null;
  labTest: {
    id: string;
    code: string;
    name: string;
    section: string | { code: string; name?: string } | null;
    referredLabOptions?: Array<{
      referredLabId: string;
      isDefault: boolean;
      referredLab: { id: string; name: string };
      priceToAdmission: number | null;
      externalLabCost: number | null;
    }>;
    template: {
      items: Array<{
        id: string;
        groupName: string | null;
        paramName: string;
        unit: string | null;
        refRangeText: string | null;
        refMin: number | null;
        refMax: number | null;
        valueType: string;
        selectOptions: string;
        order: number;
      }>;
    } | null;
  };
  result: {
    reportedBy: string | null;
    comment: string | null;
    items: Array<{
      id: string;
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
    }>;
  } | null;
};

type Order = {
  id: string;
  status?: string;
  items: OrderItem[];
  patient?: {
    birthDate: Date | string;
    sex: "M" | "F" | "O";
  };
};

type Props = {
  order: Order;
  /** Abre automáticamente el diálogo de captura de este item (ej. desde lista de pendientes) */
  defaultOpenItemId?: string;
  /** Si false, no se muestra el botón de quitar análisis (solo administradores pueden eliminar). */
  canDeleteItems?: boolean;
};

export function OrderItemsTableWithPrint({ order, defaultOpenItemId, canDeleteItems = true }: Props) {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(defaultOpenItemId ?? null);
  const [addAnalysisOpen, setAddAnalysisOpen] = useState(false);
  const [selectedReferredByItemId, setSelectedReferredByItemId] = useState<Record<string, string>>({});

  const existingLabTestIds = useMemo(
    () => order.items.map((i) => i.labTest.id),
    [order.items],
  );
  const canAddAnalysis = order.status !== "ANULADO";

  const itemsByPromotion = useMemo(() => {
    const groups: { promotionKey: string | null; promotionName: string; items: OrderItem[] }[] = [];
    const byKey = new Map<string | null, OrderItem[]>();
    for (const item of order.items) {
      const key = item.promotionId ?? null;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(item);
    }
    byKey.forEach((items, key) => {
      const promotionName = key == null ? "Análisis sueltos" : (items[0].promotionName ?? "Promoción");
      groups.push({ promotionKey: key, promotionName, items });
    });
    return groups;
  }, [order.items]);

  const printableItemIds = useMemo(
    () => order.items.map((item) => item.id),
    [order.items],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(printableItemIds),
  );

  const toggleItem = (itemId: string) => {
    if (!printableItemIds.includes(itemId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(printableItemIds));
  const deselectAll = () => setSelectedIds(new Set());

  const allSelected =
    printableItemIds.length > 0 &&
    printableItemIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const printUrl = `/orders/${order.id}/print?items=${Array.from(selectedIds).join(",")}`;

  if (order.items.length === 0) {
    const canAddAnalysis = order.status !== "ANULADO";
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Análisis solicitados</CardTitle>
          {canAddAnalysis && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddAnalysisOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Añadir análisis
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            <p>No hay análisis solicitados en esta orden.</p>
            {canAddAnalysis && (
              <p className="mt-1 text-sm">
                Usa el botón &quot;Añadir análisis&quot; para agregar análisis del catálogo.
              </p>
            )}
          </div>
        </CardContent>
        {canAddAnalysis && (
          <AddAnalysisToOrderDialog
            orderId={order.id}
            existingLabTestIds={[]}
            open={addAnalysisOpen}
            onOpenChange={setAddAnalysisOpen}
          />
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="mb-0">Análisis solicitados</CardTitle>
          {canAddAnalysis && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAddAnalysisOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Añadir análisis
              </Button>
              <AddAnalysisToOrderDialog
                orderId={order.id}
                existingLabTestIds={existingLabTestIds}
                open={addAnalysisOpen}
                onOpenChange={setAddAnalysisOpen}
              />
            </>
          )}
        </div>
        {printableItemIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? deselectAll : selectAll}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <span className="text-slate-300">|</span>
            <Link
              href={printUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={selectedIds.size === 0}
              className={selectedIds.size === 0 ? "pointer-events-none opacity-50" : ""}
            >
              <Button size="sm" className="gap-2" disabled={selectedIds.size === 0}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Imprimir seleccionados en PDF
                {someSelected && (
                  <span className="ml-1 text-xs opacity-90">
                    ({selectedIds.size})
                  </span>
                )}
              </Button>
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`-mx-1 overflow-x-auto ${order.items.length > 10 ? "max-h-[420px] overflow-y-auto" : ""}`}
          role="region"
          aria-label="Lista de análisis solicitados"
        >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              {printableItemIds.length > 0 && (
                <TableHead className="w-10">Sel.</TableHead>
              )}
              <TableHead>Análisis</TableHead>
              <TableHead>Sección</TableHead>
              <TableHead>Lab. referido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Resultados</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsByPromotion.map((group) => (
              <Fragment key={group.promotionKey ?? "sueltos"}>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableCell
                      colSpan={printableItemIds.length > 0 ? 7 : 6}
                      className="font-semibold text-slate-700 py-2"
                    >
                      {group.promotionKey != null ? (
                        <span className="text-amber-700">Promoción: {group.promotionName}</span>
                      ) : (
                        <span className="text-slate-600">{group.promotionName}</span>
                      )}
                    </TableCell>
                  </TableRow>
                {group.items.map((item) => {
              const hasResults =
                item.result && (item.result.items?.length ?? 0) > 0;
              const canSelect = printableItemIds.includes(item.id);
              const isSelected = selectedIds.has(item.id);

              const templateItems = item.result
                ? (() => {
                    const patientBirthDate = order.patient?.birthDate 
                      ? (typeof order.patient.birthDate === "string" 
                          ? new Date(order.patient.birthDate) 
                          : order.patient.birthDate)
                      : undefined;
                    const patientSex = order.patient?.sex;

                    const templateItemsFromSnapshot = getTemplateItemsForPatient(
                      item.templateSnapshot,
                      item.labTest.template
                        ? {
                            items: item.labTest.template.items.map((t) => ({
                              id: t.id,
                              groupName: t.groupName,
                              paramName: t.paramName,
                              unit: t.unit,
                              refRangeText: t.refRangeText,
                              refMin: t.refMin ? Number(t.refMin) : null,
                              refMax: t.refMax ? Number(t.refMax) : null,
                              valueType: t.valueType as "NUMBER" | "DECIMAL" | "PERCENTAGE" | "TEXT" | "SELECT",
                              selectOptions: parseSelectOptions(t.selectOptions),
                              order: t.order,
                              refRanges: ((t as { refRanges?: import("@/lib/template-helpers").RefRange[] }).refRanges ?? []) as import("@/lib/template-helpers").RefRange[],
                            })),
                          }
                        : null,
                      patientBirthDate,
                      patientSex,
                    );

                    return item.result!.items.map((r, idx) => {
                      const originalItem = templateItemsFromSnapshot.find(
                        (t) => t.id === r.templateItemId,
                      );
                      // Buscar el item original en la plantilla para obtener refRanges
                      const originalTemplateItem = item.labTest.template?.items.find(
                        (t) => t.id === r.templateItemId,
                      );
                      return {
                        id: r.templateItemId || `snapshot-${idx}`,
                        groupName: originalItem?.groupName || null,
                        paramName: r.paramNameSnapshot,
                        unit: r.unitSnapshot,
                        refRangeText: r.refTextSnapshot,
                        refMin: r.refMinSnapshot ? Number(r.refMinSnapshot) : null,
                        refMax: r.refMaxSnapshot ? Number(r.refMaxSnapshot) : null,
                        valueType: (originalItem?.valueType || "NUMBER") as
                          | "NUMBER"
                          | "DECIMAL"
                          | "PERCENTAGE"
                          | "TEXT"
                          | "SELECT",
                        selectOptions: originalItem?.selectOptions || [],
                        order: r.order,
                        refRanges: ((originalTemplateItem as { refRanges?: import("@/lib/template-helpers").RefRange[] } | undefined)?.refRanges ?? []) as import("@/lib/template-helpers").RefRange[],
                      };
                    });
                  })()
                : (() => {
                    const patientBirthDate = order.patient?.birthDate 
                      ? (typeof order.patient.birthDate === "string" 
                          ? new Date(order.patient.birthDate) 
                          : order.patient.birthDate)
                      : undefined;
                    const patientSex = order.patient?.sex;

                    const itemsWithRefRanges = item.labTest.template
                      ? {
                          items: item.labTest.template.items.map((t) => ({
                            id: t.id,
                            groupName: t.groupName,
                            paramName: t.paramName,
                            unit: t.unit,
                            refRangeText: t.refRangeText,
                            refMin: t.refMin ? Number(t.refMin) : null,
                            refMax: t.refMax ? Number(t.refMax) : null,
                            valueType: t.valueType as "NUMBER" | "DECIMAL" | "PERCENTAGE" | "TEXT" | "SELECT",
                            selectOptions: parseSelectOptions(t.selectOptions),
                            order: t.order,
                            refRanges: ((t as { refRanges?: import("@/lib/template-helpers").RefRange[] }).refRanges ?? []) as import("@/lib/template-helpers").RefRange[],
                          })),
                        }
                      : null;
                    
                    const processedItems = getTemplateItemsForPatient(
                      item.templateSnapshot,
                      itemsWithRefRanges,
                      patientBirthDate,
                      patientSex,
                    );
                    
                    // Restaurar los refRanges originales para mostrar todos
                    return processedItems.map((processedItem) => {
                      const originalItem = itemsWithRefRanges?.items.find((t) => t.id === processedItem.id);
                      return {
                        ...processedItem,
                        refRanges: originalItem?.refRanges || [],
                      };
                    });
                  })();

              const patientBirthDate = order.patient?.birthDate 
                ? (typeof order.patient.birthDate === "string" 
                    ? new Date(order.patient.birthDate) 
                    : order.patient.birthDate)
                : undefined;
              const patientSex = order.patient?.sex;

              const originalTemplateItems = item.labTest.template
                ? (() => {
                    const itemsWithRefRanges = item.labTest.template.items.map((t) => ({
                      id: t.id,
                      groupName: t.groupName,
                      paramName: t.paramName,
                      unit: t.unit,
                      refRangeText: t.refRangeText,
                      refMin: t.refMin ? Number(t.refMin) : null,
                      refMax: t.refMax ? Number(t.refMax) : null,
                      valueType: t.valueType as "NUMBER" | "DECIMAL" | "PERCENTAGE" | "TEXT" | "SELECT",
                      selectOptions: parseSelectOptions(t.selectOptions),
                      order: t.order,
                      refRanges: ((t as { refRanges?: import("@/lib/template-helpers").RefRange[] }).refRanges ?? []) as import("@/lib/template-helpers").RefRange[],
                    }));
                    
                    const processedItems = getTemplateItemsForPatient(
                      null,
                      { items: itemsWithRefRanges },
                      patientBirthDate,
                      patientSex,
                    );
                    
                    // Restaurar los refRanges originales (no filtrados) para mostrar todos
                    return processedItems.map((processedItem) => {
                      const originalItem = itemsWithRefRanges.find((t) => t.id === processedItem.id);
                      return {
                        ...processedItem,
                        refRanges: originalItem?.refRanges || [],
                      };
                    });
                  })()
                : [];

              const finalTemplateItems =
                templateItems.length > 0 ? templateItems : originalTemplateItems;

              const referredOptions = item.labTest.referredLabOptions ?? [];

              const handleReferredLabChange = async (newLabId: string) => {
                setSelectedReferredByItemId((prev) => ({ ...prev, [item.id]: newLabId }));
                try {
                  const res = await fetch(
                    `/api/orders/${order.id}/items/${item.id}/referred-lab`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ referredLabId: newLabId || null }),
                    },
                  );
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(
                      data.error || "No se pudo actualizar el laboratorio referido.",
                    );
                    // restaurar valor previo al fallar
                    const prevFallback =
                      item.referredLabId ??
                      referredOptions.find((o) => o.isDefault)?.referredLabId ??
                      referredOptions[0]?.referredLabId ??
                      "";
                    setSelectedReferredByItemId((prev) => ({ ...prev, [item.id]: prevFallback }));
                    return;
                  }
                  router.refresh();
                } catch {
                  toast.error("Error de conexión al actualizar el laboratorio referido.");
                  const prevFallback =
                    item.referredLabId ??
                    referredOptions.find((o) => o.isDefault)?.referredLabId ??
                    referredOptions[0]?.referredLabId ??
                    "";
                  setSelectedReferredByItemId((prev) => ({ ...prev, [item.id]: prevFallback }));
                }
              };

              return (
                <TableRow key={item.id} className={group.promotionKey != null ? "bg-amber-50/30" : undefined}>
                  {printableItemIds.length > 0 && (
                    <TableCell className="w-10">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {item.labTest.code} - {item.labTest.name}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">
                      {typeof item.labTest.section === "object" && item.labTest.section
                        ? (item.labTest.section.name ?? item.labTest.section.code)
                        : (item.labTest.section ?? "")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {referredOptions.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : referredOptions.length === 1 ? (
                      <span className="text-xs text-slate-600">
                        {referredOptions[0].referredLab.name}
                      </span>
                    ) : (
                      <select
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        value={
                          selectedReferredByItemId[item.id] ??
                          item.referredLabId ??
                          referredOptions.find((o) => o.isDefault)?.referredLabId ??
                          referredOptions[0].referredLabId
                        }
                        onChange={(e) => void handleReferredLabChange(e.target.value)}
                      >
                        {referredOptions.map((opt) => (
                          <option key={opt.referredLabId} value={opt.referredLabId}>
                            {opt.referredLab.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {hasResults ? (
                      <Badge
                        variant="success"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        {(() => {
                          // Usar el conteo de la plantilla (source of truth) si existe
                          const templateCount = item.labTest.template?.items?.length;
                          if (templateCount != null && templateCount > 0) {
                            return `${templateCount} parámetro${templateCount !== 1 ? "s" : ""}`;
                          }
                          // Fallback: deduplicar por (paramName, unit) por si result tiene duplicados
                          const items = item.result!.items;
                          const seen = new Set<string>();
                          items.forEach((r) => {
                            const key = `${(r.paramNameSnapshot ?? "").trim()}|${(r.unitSnapshot ?? "").trim()}`;
                            seen.add(key);
                          });
                          const count = seen.size;
                          return `${count} parámetro${count !== 1 ? "s" : ""}`;
                        })()}
                      </Badge>
                    ) : (
                      <Badge
                        variant="warning"
                        className="bg-amber-100 text-amber-700"
                      >
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(Number(item.priceSnapshot))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {finalTemplateItems.length > 0 || item.labTest.template ? (
                        <OrderItemResultDialog
                          orderId={order.id}
                          itemId={item.id}
                          testName={item.labTest.name}
                          testCode={item.labTest.code}
                          templateItems={finalTemplateItems}
                          open={openItemId === item.id}
                          onOpenChange={(open) => setOpenItemId(open ? item.id : null)}
                          existing={
                            item.result
                              ? {
                                  reportedBy: item.result.reportedBy,
                                  comment: item.result.comment,
                                  items: item.result.items.map((r) => ({
                                    templateItemId: r.templateItemId,
                                    paramNameSnapshot: r.paramNameSnapshot,
                                    unitSnapshot: r.unitSnapshot,
                                    refTextSnapshot: r.refTextSnapshot,
                                    refMinSnapshot: r.refMinSnapshot
                                      ? Number(r.refMinSnapshot)
                                      : null,
                                    refMaxSnapshot: r.refMaxSnapshot
                                      ? Number(r.refMaxSnapshot)
                                      : null,
                                    value: r.value,
                                    isOutOfRange: r.isOutOfRange,
                                    isHighlighted: r.isHighlighted ?? false,
                                    order: r.order,
                                  })),
                                }
                              : undefined
                          }
                        />
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sin plantilla
                        </span>
                      )}
                      {canDeleteItems && (
                        <DeleteButton
                          url={`/api/orders/${order.id}/items/${item.id}`}
                          label="Quitar"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
