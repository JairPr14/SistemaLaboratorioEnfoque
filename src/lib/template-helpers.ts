import { parseSelectOptions } from "./json-helpers";

type TemplateSnapshotItem = {
  id: string;
  groupName: string | null;
  paramName: string;
  unit: string | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  valueType: string;
  selectOptions: string[] | string;
  order: number;
};

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

export function getTemplateItemsForPatient(
  templateSnapshot: unknown,
  originalTemplate: { items: TemplateItem[] } | null,
): TemplateItem[] {
  // Si hay templateSnapshot guardado, usarlo (copia de la plantilla para este paciente)
  if (templateSnapshot && typeof templateSnapshot === "object" && "items" in templateSnapshot) {
    const snapshot = templateSnapshot as { items: TemplateSnapshotItem[] };
    return snapshot.items.map((item) => ({
      id: item.id,
      groupName: item.groupName,
      paramName: item.paramName,
      unit: item.unit,
      refRangeText: item.refRangeText,
      refMin: item.refMin,
      refMax: item.refMax,
      valueType: (item.valueType || "NUMBER") as "NUMBER" | "TEXT" | "SELECT",
      selectOptions: Array.isArray(item.selectOptions)
        ? item.selectOptions
        : typeof item.selectOptions === "string"
          ? parseSelectOptions(item.selectOptions)
          : [],
      order: item.order,
    }));
  }

  // Si no hay snapshot, usar la plantilla original como base
  if (originalTemplate) {
    return originalTemplate.items.map((item) => ({
      ...item,
      refMin: item.refMin ? Number(item.refMin) : null,
      refMax: item.refMax ? Number(item.refMax) : null,
      selectOptions: parseSelectOptions(item.selectOptions),
    }));
  }

  return [];
}
