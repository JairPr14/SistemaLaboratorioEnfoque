export function parseSelectOptions(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifySelectOptions(value: string[] | null | undefined): string {
  if (!value || !Array.isArray(value)) return "[]";
  return JSON.stringify(value);
}
