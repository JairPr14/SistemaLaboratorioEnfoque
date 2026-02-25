export const PAYMENT_METHOD_LABELS = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
} as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "EFECTIVO", label: PAYMENT_METHOD_LABELS.EFECTIVO },
  { value: "TARJETA", label: PAYMENT_METHOD_LABELS.TARJETA },
  { value: "TRANSFERENCIA", label: PAYMENT_METHOD_LABELS.TRANSFERENCIA },
  { value: "CREDITO", label: "Crédito (por cobrar)" },
] as const;

export type PaymentMethodValue = keyof typeof PAYMENT_METHOD_LABELS;
