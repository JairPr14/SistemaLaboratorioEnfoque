export function buildPatientCode() {
  return `PAC-${String(Date.now()).slice(-8)}`;
}

export function buildOrderCode(sequence: number, date?: Date) {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `ORD-${y}${m}${day}-${seq}`;
}
