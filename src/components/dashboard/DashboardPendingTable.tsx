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
import { Eye, ArrowDown, ArrowUp } from "lucide-react";

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

type SortOrder = "desc" | "asc";

function sortOrdersByDate(orders: OrderRow[], sortOrder: SortOrder): OrderRow[] {
  return [...orders].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortOrder === "desc" ? tb - ta : ta - tb;
  });
}

export function DashboardPendingTable({ orders, defaultFilters, sectionOptions }: Props) {
  const [filters, setFilters] = useState<OrdersFilterState>({
    ...initialFilters,
    ...defaultFilters,
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filtered = sortOrdersByDate(filterOrders(orders, filters), sortOrder);
  const hasActiveFilters =
    !!filters.status || !!filters.dateRange || !!filters.doctor || !!filters.section;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OrdersFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(initialFilters)}
          hasActiveFilters={hasActiveFilters}
          sectionOptions={sectionOptions}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
          className="gap-1.5 shrink-0 rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          title={sortOrder === "desc" ? "Más reciente primero (clic para más antiguo primero)" : "Más antiguo primero (clic para más reciente primero)"}
        >
          {sortOrder === "desc" ? (
            <>
              <ArrowDown className="h-4 w-4" />
              Más reciente primero
            </>
          ) : (
            <>
              <ArrowUp className="h-4 w-4" />
              Más antiguo primero
            </>
          )}
        </Button>
      </div>
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
