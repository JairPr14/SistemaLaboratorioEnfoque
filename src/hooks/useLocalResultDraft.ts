"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "result-draft:";

function storageKey(orderId: string, itemId: string): string {
  return `${STORAGE_PREFIX}${orderId}:${itemId}`;
}

type DraftData = {
  reportedBy: string;
  comment: string;
  items: Array<{
    templateItemId: string | null;
    paramNameSnapshot: string;
    unitSnapshot: string | null;
    refTextSnapshot: string | null;
    refMinSnapshot: number | null;
    refMaxSnapshot: number | null;
    value: string;
    isOutOfRange: boolean;
    isHighlighted: boolean;
    order: number;
  }>;
  savedAt: string;
};

function serialize(values: { reportedBy?: string; comment?: string; items?: unknown[] }): string {
  const items = Array.isArray(values.items) ? values.items.filter((i) => i != null) : [];
  const draft: DraftData = {
    reportedBy: String(values.reportedBy ?? ""),
    comment: String(values.comment ?? ""),
    items: items.map((item) => {
      const i = item as Record<string, unknown>;
      return {
      templateItemId: (i.templateItemId as string | null) ?? null,
      paramNameSnapshot: String(i.paramNameSnapshot ?? "Param"),
      unitSnapshot: (i.unitSnapshot as string | null) ?? null,
      refTextSnapshot: (i.refTextSnapshot as string | null) ?? null,
      refMinSnapshot: i.refMinSnapshot != null ? Number(i.refMinSnapshot) : null,
      refMaxSnapshot: i.refMaxSnapshot != null ? Number(i.refMaxSnapshot) : null,
      value: String(i.value ?? ""),
      isOutOfRange: Boolean(i.isOutOfRange ?? false),
      isHighlighted: Boolean(i.isHighlighted ?? false),
      order: Number(i.order ?? 0),
    };
    }),
    savedAt: new Date().toISOString(),
  };
  return JSON.stringify(draft);
}

function parse(raw: string): DraftData | null {
  try {
    const data = JSON.parse(raw) as DraftData;
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

type UseLocalResultDraftOptions = {
  orderId: string;
  itemId: string;
  form: { getValues: () => unknown };
  enabled?: boolean;
  debounceMs?: number;
};

/**
 * Persiste borradores de resultados en sessionStorage.
 * No llama a la API; evita pérdida de datos en recargas.
 */
export function useLocalResultDraft({
  orderId,
  itemId,
  form,
  enabled = true,
  debounceMs = 500,
}: UseLocalResultDraftOptions) {
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = storageKey(orderId, itemId);

  const loadFromStorage = useCallback((): DraftData | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return parse(raw);
    } catch {
      return null;
    }
  }, [key]);

  const persistToStorage = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    const raw = form.getValues();
    const values = (raw && typeof raw === "object" && "items" in raw) ? (raw as { reportedBy?: string; comment?: string; items?: unknown[] }) : { reportedBy: "", comment: "", items: [] };
    const items = values?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) return;
    try {
      sessionStorage.setItem(key, serialize(values));
      setHasLocalDraft(true);
    } catch {
      // QuotaExceeded o storage no disponible
    }
  }, [key, enabled, form]);

  const persistDebounced = useCallback(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      persistToStorage();
    }, debounceMs);
  }, [debounceMs, persistToStorage]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(key);
      setHasLocalDraft(false);
    } catch {
      /* noop */
    }
  }, [key]);

  return {
    loadFromStorage,
    persistToStorage,
    persistDebounced,
    clearDraft,
    hasLocalDraft,
  };
}
