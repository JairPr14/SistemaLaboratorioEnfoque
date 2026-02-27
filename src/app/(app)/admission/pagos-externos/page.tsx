import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getServerSession,
  hasPermission,
  PERMISSION_VER_ADMISION,
  PERMISSION_REGISTRAR_PAGOS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageLayoutClasses, PageHeader } from "@/components/layout/PageHeader";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PagosExternosPage() {
  const session = await getServerSession();
  const canAccess =
    session?.user &&
    (hasPermission(session, PERMISSION_VER_ADMISION) || hasPermission(session, PERMISSION_REGISTRAR_PAGOS));
  if (!canAccess) redirect("/dashboard");

  const ordersWithReferred = await prisma.labOrder.findMany({
    where: {
      orderSource: "ADMISION",
      status: { not: "ANULADO" },
    },
    include: {
      patient: true,
      items: {
        select: {
          externalLabCostSnapshot: true,
          referredLabId: true,
          labTest: {
            select: {
              isReferred: true,
              externalLabCost: true,
              referredLabId: true,
              name: true,
              code: true,
              referredLab: { select: { id: true, name: true } },
            },
          },
          referredLab: { select: { id: true, name: true } },
        },
      },
      referredLabPayments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const labMap = new Map<
    string,
    { name: string; totalCost: number; totalPaid: number; orders: typeof ordersWithReferred }
  >();
  for (const order of ordersWithReferred) {
    for (const item of order.items) {
      if (!item.labTest.isReferred) continue;
      const labId = item.referredLabId ?? item.labTest.referredLabId ?? item.referredLab?.id ?? item.labTest.referredLab?.id;
      if (!labId) continue;
      const cost = Number(
        item.externalLabCostSnapshot ?? item.labTest.externalLabCost ?? 0
      );
      if (cost <= 0) continue;
      const labName = item.referredLab?.name ?? item.labTest.referredLab?.name ?? "Lab externo";
      if (!labMap.has(labId)) {
        labMap.set(labId, { name: labName, totalCost: 0, totalPaid: 0, orders: [] });
      }
      const entry = labMap.get(labId)!;
      entry.totalCost += cost;
      if (!entry.orders.some((o) => o.id === order.id)) {
        entry.orders.push(order);
      }
    }
  }
  for (const [labId, entry] of labMap) {
    const paid = ordersWithReferred
      .filter((o) => o.referredLabPayments.some((p) => p.referredLabId === labId))
      .flatMap((o) => o.referredLabPayments)
      .filter((p) => p.referredLabId === labId)
      .reduce((s, p) => s + Number(p.amount), 0);
    entry.totalPaid = paid;
  }

  const labs = Array.from(labMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    totalCost: v.totalCost,
    totalPaid: v.totalPaid,
    balance: Math.max(0, v.totalCost - v.totalPaid),
    orderCount: new Set(v.orders.map((o) => o.id)).size,
  }));

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Pagos a laboratorios externos"
        description="Análisis referidos: pague a cada lab desde la orden correspondiente. Puede pagar uno a uno o el total pendiente por lab."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumen por laboratorio</CardTitle>
          <p className="text-sm text-slate-500">
            Ingrese a cada orden para registrar el pago al laboratorio referido.
          </p>
        </CardHeader>
        <CardContent>
          {labs.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No hay análisis referidos en órdenes de admisión.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Laboratorio</TableHead>
                    <TableHead className="text-right font-semibold">Costo total</TableHead>
                    <TableHead className="text-right font-semibold">Pagado</TableHead>
                    <TableHead className="text-right font-semibold">Pendiente</TableHead>
                    <TableHead className="text-right font-semibold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.map((lab) => (
                    <TableRow key={lab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-slate-400">
                        {formatCurrency(lab.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(lab.totalPaid)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          lab.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {formatCurrency(lab.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href="/admission/pacientes-dia"
                          className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
                        >
                          Ir a pacientes
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
