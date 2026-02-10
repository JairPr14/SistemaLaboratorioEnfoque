"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import type { FieldValues, UseFormReturn } from "react-hook-form";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

type UseAutosaveResultsOptions<T extends FieldValues> = {
  orderId: string;
  itemId: string;
  form: Pick<UseFormReturn<T>, "control" | "getValues">;
  debounceMs?: number;
  enabled?: boolean;
};

export function useAutosaveResults<T extends FieldValues>({
  orderId,
  itemId,
  form,
  debounceMs = 1000,
  enabled = true,
}: UseAutosaveResultsOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<(() => void) | null>(null);
  const isFirstRunRef = useRef(true);

  const items = useWatch({ control: form.control, name: "items" as never });

  const saveDraft = useCallback(async () => {
    const values = form.getValues() as { items?: Array<Record<string, unknown>> };
    const rawItems = values.items ?? [];
    const payloadItems = rawItems.map((item: Record<string, unknown>) => ({
      templateItemId: (item.templateItemId as string | null) ?? null,
      paramNameSnapshot: String(item.paramNameSnapshot ?? "Param"),
      unitSnapshot: (item.unitSnapshot as string | null) ?? null,
      refTextSnapshot: (item.refTextSnapshot as string | null) ?? null,
      refMinSnapshot: (item.refMinSnapshot as number | null) ?? null,
      refMaxSnapshot: (item.refMaxSnapshot as number | null) ?? null,
      value: String(item.value ?? ""),
      isOutOfRange: Boolean(item.isOutOfRange ?? false),
      order: Number(item.order ?? 0),
    }));

    setStatus("saving");
    try {
      const res = await fetch(
        `/api/orders/${orderId}/items/${itemId}/result-draft`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: payloadItems,
            updatedAtClient: new Date().toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      setStatus("saved");
      setSavedAt(new Date());
    } catch {
      setStatus("error");
      queueRef.current = () => { saveDraft(); };
    }
  }, [orderId, itemId, form]);

  useEffect(() => {
    const arr = Array.isArray(items) ? items : [];
    if (!enabled || arr.length === 0) return;
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    const triggerSave = () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current);
      }
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        saveDraft();
      }, debounceMs);
    };

    triggerSave();
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [items, debounceMs, enabled, saveDraft]);

  const saveOnBlur = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    saveDraft();
  }, [saveDraft]);

  const retry = useCallback(() => {
    if (queueRef.current) {
      queueRef.current();
      queueRef.current = null;
    } else {
      saveDraft();
    }
  }, [saveDraft]);

  return { status, savedAt, saveOnBlur, retry };
}
