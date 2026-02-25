export const ORDER_STATUS_CLASS: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EN_PROCESO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ENTREGADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ANULADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const PAYMENT_STATUS_CLASS: Record<string, string> = {
  PENDIENTE: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  PARCIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PAGADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};
