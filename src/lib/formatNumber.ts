/**
 * Formato numérico con separador de miles (locale es: 1.234,56)
 * - Miles: punto (.)
 * - Decimal: coma (,)
 */
const THOUSAND_SEP = ".";
const DECIMAL_SEP = ",";

/** Parsea entrada con separadores a valor raw (ej: "1.234,56" → "1234.56") */
export function parseFormattedNumber(input: string): string {
  if (!input || typeof input !== "string") return "";
  const s = input.trim();
  if (!s) return "";
  const cleaned = s.replace(/\s/g, "");
  const parts = cleaned.split(/[,.]/);
  if (parts.length === 1) {
    return parts[0].replace(/\D/g, "");
  }
  if (parts.length === 2) {
    const intPart = parts[0].replace(/\D/g, "");
    const decPart = parts[1].replace(/\D/g, "");
    return decPart ? `${intPart || "0"}.${decPart}` : intPart || "0";
  }
  const last = parts.pop()!.replace(/\D/g, "");
  const first = parts.join("").replace(/\D/g, "");
  return last ? `${first || "0"}.${last}` : first || "0";
}

/** Formatea valor raw con separadores de miles (ej: "1234.56" → "1.234,56") */
export function formatWithThousands(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s) return "";
  const normalized = s.replace(",", ".");
  const [intPart, decPart] = normalized.split(".");
  const intClean = (intPart || "").replace(/\D/g, "");
  const decClean = decPart !== undefined ? decPart.replace(/\D/g, "") : "";
  if (!intClean && !decClean) return "";
  const formattedInt = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEP);
  if (decClean) return formattedInt + DECIMAL_SEP + decClean;
  return formattedInt;
}
