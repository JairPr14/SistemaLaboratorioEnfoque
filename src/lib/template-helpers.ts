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
  refRanges?: RefRange[];
};

export type RefRange = {
  id?: string;
  ageGroup: string | null;
  sex: "M" | "F" | "O" | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  order: number;
};

export type TemplateItem = {
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
  refRanges?: RefRange[];
};

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getAgeGroup(age: number): "NIÑOS" | "JOVENES" | "ADULTOS" | null {
  if (age < 12) return "NIÑOS";
  if (age < 18) return "JOVENES";
  return "ADULTOS";
}

export function selectRefRange(
  refRanges: RefRange[] | undefined,
  patientAge: number,
  patientSex: "M" | "F" | "O"
): { refRangeText: string | null; refMin: number | null; refMax: number | null } {
  if (!refRanges || refRanges.length === 0) {
    return { refRangeText: null, refMin: null, refMax: null };
  }

  const ageGroup = getAgeGroup(patientAge);

  // Prioridad: 1) edad + sexo, 2) solo edad, 3) solo sexo, 4) ninguno (default)
  const matches = refRanges
    .map((r, idx) => ({ ...r, originalIndex: idx }))
    .filter((r) => {
      const ageMatch = !r.ageGroup || r.ageGroup === ageGroup;
      const sexMatch = !r.sex || r.sex === patientSex;
      return ageMatch && sexMatch;
    })
    .sort((a, b) => {
      // Priorizar rangos más específicos (con más criterios)
      const aSpecificity = (a.ageGroup ? 1 : 0) + (a.sex ? 1 : 0);
      const bSpecificity = (b.ageGroup ? 1 : 0) + (b.sex ? 1 : 0);
      if (bSpecificity !== aSpecificity) return bSpecificity - aSpecificity;
      return a.order - b.order;
    });

  if (matches.length > 0) {
    const bestMatch = matches[0];
    return {
      refRangeText: bestMatch.refRangeText,
      refMin: bestMatch.refMin,
      refMax: bestMatch.refMax,
    };
  }

  // Si no hay coincidencia específica, usar el primero sin criterios (default)
  const defaultRange = refRanges.find((r) => !r.ageGroup && !r.sex);
  if (defaultRange) {
    return {
      refRangeText: defaultRange.refRangeText,
      refMin: defaultRange.refMin,
      refMax: defaultRange.refMax,
    };
  }

  return { refRangeText: null, refMin: null, refMax: null };
}

export function getTemplateItemsForPatient(
  templateSnapshot: unknown,
  originalTemplate: { items: TemplateItem[] } | null,
  patientBirthDate?: Date,
  patientSex?: "M" | "F" | "O",
): TemplateItem[] {
  // Si hay templateSnapshot guardado, usarlo (copia de la plantilla para este paciente)
  if (templateSnapshot && typeof templateSnapshot === "object" && "items" in templateSnapshot) {
    const snapshot = templateSnapshot as { items: TemplateSnapshotItem[] };
    // Edad: siempre calcular desde fecha de nacimiento; si falta, asumir adulto (18) para rangos por sexo
    const age = patientBirthDate ? calculateAge(patientBirthDate) : 18;
    const sex = patientSex ?? null;

    return snapshot.items.map((item) => {
      // Usar refRanges del snapshot; si está vacío, tomar del template original (fallback para datos antiguos)
      const snapshotRefRanges = item.refRanges ?? [];
      const originalItem = originalTemplate?.items.find((t) => t.id === item.id);
      const refRanges =
        snapshotRefRanges.length > 0 ? snapshotRefRanges : (originalItem?.refRanges ?? []);

      // Aplicar selectRefRange: sexo del paciente (Hombres/Mujeres) y edad (niños → NIÑOS) para validar OK/Fuera
      let refRangeText = item.refRangeText;
      let refMin = item.refMin;
      let refMax = item.refMax;
      if (refRanges.length > 0 && sex) {
        const selected = selectRefRange(refRanges, age, sex);
        if (selected.refRangeText || selected.refMin !== null || selected.refMax !== null) {
          refRangeText = selected.refRangeText ?? refRangeText;
          refMin = selected.refMin ?? refMin;
          refMax = selected.refMax ?? refMax;
        }
      }

      return {
        id: item.id,
        groupName: item.groupName,
        paramName: item.paramName,
        unit: item.unit,
        refRangeText,
        refMin,
        refMax,
        valueType: (item.valueType || "NUMBER") as TemplateItem["valueType"],
        selectOptions: Array.isArray(item.selectOptions)
          ? item.selectOptions
          : typeof item.selectOptions === "string"
            ? parseSelectOptions(item.selectOptions)
            : [],
        order: item.order,
        refRanges,
      };
    });
  }

  // Si no hay snapshot, usar la plantilla original como base
  if (originalTemplate) {
    // Edad: desde fecha de nacimiento; si falta, asumir adulto para rangos por sexo
    const age = patientBirthDate ? calculateAge(patientBirthDate) : 18;
    const sex = patientSex || null;

    return originalTemplate.items.map((item) => {
      // Seleccionar rango por sexo (Hombres/Mujeres) y edad (niños → NIÑOS)
      let refRangeText = item.refRangeText;
      let refMin = item.refMin ? Number(item.refMin) : null;
      let refMax = item.refMax ? Number(item.refMax) : null;

      if (item.refRanges && item.refRanges.length > 0 && sex) {
        const selectedRange = selectRefRange(item.refRanges, age, sex);
        if (selectedRange.refRangeText || selectedRange.refMin !== null || selectedRange.refMax !== null) {
          refRangeText = selectedRange.refRangeText;
          refMin = selectedRange.refMin;
          refMax = selectedRange.refMax;
        }
      }

      return {
        ...item,
        refRangeText,
        refMin,
        refMax,
        selectOptions: parseSelectOptions(item.selectOptions),
      };
    });
  }

  return [];
}
