export function buildPatientCode() {
  return `PAC-${String(Date.now()).slice(-8)}`;
}

export function buildOrderCode(sequence: number) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `ORD-${y}${m}${d}-${seq}`;
}
