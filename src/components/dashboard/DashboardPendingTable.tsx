"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { statusBadgeVariant } from "@/lib/order-utils";
import { OrdersFilters, type OrdersFilterState } from "./OrdersFilters";
import { OrderAlertsCell } from "@/components/orders/OrderAlertsCell";
import { getOrderAlerts } from "@/features/lab/order-alerts";
import { Eye } from "lucide-react";

type OrderRow = {
  id: string;
  orderCode: string;
  createdAt: Date;
  deliveredAt?: Date | null;
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "ENTREGADO" | "ANULADO";
  patient: { firstName: string; lastName: string };
  items?: { labTest: { name: string } }[];
  requestedBy?: string | null;
  itemsSection?: string;
  paymentStatus?: "PENDIENTE" | "PARCIAL" | "PAGADO";
  totalTests: number;
  completedTests: number;
  needsValidation: boolean;
  missingCount: number;
};

type Props = {
  orders: OrderRow[];
  defaultFilters?: Partial<OrdersFilterState>;
  sectionOptions?: { value: string; label: string }[];
};

const initialFilters: OrdersFilterState = {
  status: "",
  dateRange: "7d",
  doctor: "",
  section: "",
};

function filterOrders(
  orders: OrderRow[],
  filters: OrdersFilterState
): OrderRow[] {
  let result = [...orders];

  if (filters.status) {
    result = result.filter((o) => o.status === filters.status);
  }
  if (filters.dateRange) {
    const now = new Date();
    const cut = new Date(now);
    if (filters.dateRange === "today") {
      cut.setHours(0, 0, 0, 0);
    } else if (filters.dateRange === "7d") {
      cut.setDate(cut.getDate() - 7);
    } else if (filters.dateRange === "30d") {
      cut.setDate(cut.getDate() - 30);
    }
    result = result.filter((o) => new Date(o.createdAt) >= cut);
  }
  if (filters.doctor) {
    result = result.filter(
      (o) => o.requestedBy?.toLowerCase().includes(filters.doctor.toLowerCase())
    );
  }
  if (filters.section) {
    result = result.filter(
      (o) => (o.itemsSection ?? "").toUpperCase() === filters.section
    );
  }
  return result;
}

function sortByRiskAndAge(orders: OrderRow[]): OrderRow[] {
  const severityScore = (o: OrderRow) => {
    const alerts = getOrderAlerts({
      status: o.status,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt,
      totalTests: o.totalTests,
      completedTests: o.completedTests,
      needsValidation: o.needsValidation,
      missingCount: o.missingCount,
    });
    const max =
      alerts.length > 0
        ? Math.min(
            ...alerts.map((a) =>
              a.severity === "red" ? 0 : a.severity === "yellow" ? 1 : 2
            )
          )
        : 2;
    return max;
  };
  return [...orders].sort((a, b) => {
    const sa = severityScore(a);
    const sb = severityScore(b);
    if (sa !== sb) return sa - sb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function DashboardPendingTable({ orders, defaultFilters, sectionOptions }: Props) {
  const [filters, setFilters] = useState<OrdersFilterState>({
    ...initialFilters,
    ...defaultFilters,
  });

  const filtered = sortByRiskAndAge(filterOrders(orders, filters));
  const hasActiveFilters =
    !!filters.status || !!filters.dateRange || !!filters.doctor || !!filters.section;

  return (
    <div className="space-y-4">
      <OrdersFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(initialFilters)}
        hasActiveFilters={hasActiveFilters}
        sectionOptions={sectionOptions}
      />
      <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cobro</TableHead>
              <TableHead>Análisis</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <p className="text-slate-500 dark:text-slate-300">No hay órdenes pendientes</p>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                    Crea una nueva orden o ajusta los filtros
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const analyses =
                  order.items
                    ?.map((i) => i.labTest?.name)
                    .filter(Boolean)
                    .join(", ") || "-";
                const canCapture =
                  order.status === "PENDIENTE" || order.status === "EN_PROCESO";
                const canPdf =
                  order.status === "COMPLETADO" || order.status === "ENTREGADO";
                const canDeliver = order.status === "COMPLETADO";
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {order.patient.firstName} {order.patient.lastName}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.paymentStatus === "PAGADO"
                            ? "success"
                            : order.paymentStatus === "PARCIAL"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {order.paymentStatus ?? "PENDIENTE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-600 dark:text-slate-300">
                      {analyses}
                    </TableCell>
                    <TableCell>
                      <OrderAlertsCell
                        order={{
                          status: order.status,
                          createdAt: order.createdAt,
                          deliveredAt: order.deliveredAt ?? undefined,
                          totalTests: order.totalTests,
                          completedTests: order.completedTests,
                          needsValidation: order.needsValidation,
                          missingCount: order.missingCount,
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {canCapture && (
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8">
                              Capturar
                            </Button>
                          </Link>
                        )}
                        {canPdf && (
                          <Link
                            href={`/orders/${order.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="h-8">
                              PDF
                            </Button>
                          </Link>
                        )}
                        {canDeliver && (
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8">
                              Entregar
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
