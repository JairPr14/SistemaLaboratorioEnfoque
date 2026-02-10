"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeVariant } from "@/lib/order-utils";
import { formatDate } from "@/lib/format";
import type { WorklistAlert } from "@/features/lab/worklist-rules";
import { ClipboardList, ChevronRight } from "lucide-react";

const SECTIONS = [
  { value: "BIOQUIMICA", label: "Bioquímica" },
  { value: "HEMATOLOGIA", label: "Hematología" },
  { value: "INMUNOLOGIA", label: "Inmunología" },
  { value: "ORINA", label: "Orina" },
  { value: "HECES", label: "Heces" },
  { value: "OTROS", label: "Otros" },
] as const;

type WorklistRow = {
  orderId: string;
  code: string;
  patientName: string;
  createdAt: string;
  status: string;
  section: string;
  tests: {
    testId: string;
    name: string;
    code: string;
    isComplete: boolean;
    missingCount: number;
    alerts: WorklistAlert[];
  }[];
  orderAlerts: WorklistAlert[];
  slaLevel: "green" | "yellow" | "red";
};

function AlertChips({
  alerts,
  maxVisible = 3,
}: {
  alerts: WorklistAlert[];
  maxVisible?: number;
}) {
  const visible = alerts.slice(0, maxVisible);
  const rest = alerts.length - maxVisible;
  const variantMap = {
    red: "danger" as const,
    yellow: "warning" as const,
    green: "success" as const,
  };
  const tooltip =
    alerts.length > maxVisible
      ? alerts.map((a) => a.label).join(" · ")
      : undefined;

  return (
    <div className="flex flex-wrap items-center gap-1" title={tooltip}>
      {visible.map((a, i) => (
        <Badge key={`${a.code}-${i}`} variant={variantMap[a.severity]} className="text-xs py-0">
          {a.label}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge variant="secondary" className="py-0 text-xs" title={tooltip}>
          +{rest}
        </Badge>
      )}
    </div>
  );
}

export default function WorklistPage() {
  const [section, setSection] = useState<string>(SECTIONS[0].value);
  const [range, setRange] = useState("7d");
  const [items, setItems] = useState<WorklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/worklist?section=${encodeURIComponent(section)}&range=${encodeURIComponent(range)}`
    )
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [section, range]);

  const firstPending = items.flatMap((row) =>
    row.tests
      .filter((t) => !t.isComplete)
      .map((t) => ({ orderId: row.orderId, testId: t.testId }))
  )[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Worklist
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Órdenes pendientes por sección. Ordenado por riesgo (SLA) y antigüedad.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSection(s.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  section === s.value
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="today">Hoy</option>
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
            </select>
            {firstPending && (
              <Link
                href={`/orders/${firstPending.orderId}?captureItem=${firstPending.testId}`}
              >
                <Button size="sm" className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Siguiente pendiente
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                      No hay órdenes pendientes en esta sección
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => {
                    const pendingTests = row.tests.filter((t) => !t.isComplete);
                    const missingLabel =
                      pendingTests.length === 0
                        ? "0"
                        : `${pendingTests.length} análisis`;

                    const firstTestId = pendingTests[0]?.testId;

                    return (
                      <TableRow key={row.orderId}>
                        <TableCell>
                          <Link
                            href={`/orders/${row.orderId}`}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                          >
                            {row.code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {row.patientName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(row.status as never)}>
                            {row.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {missingLabel}
                        </TableCell>
                        <TableCell>
                          <AlertChips alerts={row.orderAlerts} />
                        </TableCell>
                        <TableCell className="text-right">
                          {firstTestId ? (
                            <Link
                              href={`/orders/${row.orderId}?captureItem=${firstTestId}`}
                            >
                              <Button size="sm" variant="default" className="gap-1">
                                <ClipboardList className="h-4 w-4" />
                                Capturar
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/orders/${row.orderId}`}>
                              <Button size="sm" variant="outline">
                                Ver
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
