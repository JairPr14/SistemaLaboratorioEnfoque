import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession, hasPermission, isReceptionProfile } from "@/lib/auth";
import {
  PERMISSION_VER_ORDENES,
  PERMISSION_VER_PACIENTES,
  PERMISSION_VER_CATALOGO,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_REGISTRAR_PAGOS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Calendar } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardPendingTable } from "@/components/dashboard/DashboardPendingTable";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export const dynamic = "force-dynamic";

type DashboardOrderStatus =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "ENTREGADO"
  | "ANULADO";

function toDashboardOrderStatus(status: string): DashboardOrderStatus {
  return status === "PENDIENTE" ||
    status === "EN_PROCESO" ||
    status === "COMPLETADO" ||
    status === "ENTREGADO" ||
    status === "ANULADO"
    ? status
    : "PENDIENTE";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    pendingStatus?: string;
    pendingDate?: string;
    pendingSection?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await getServerSession();

  if (session?.user && isReceptionProfile(session)) redirect("/orders");

  const hasOrders = !!session?.user && hasPermission(session, PERMISSION_VER_ORDENES);
  const hasPatients = !!session?.user && hasPermission(session, PERMISSION_VER_PACIENTES);
  const hasCatalog = !!session?.user && hasPermission(session, PERMISSION_VER_CATALOGO);
  const hasReception = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_RECEPCION);
  const hasAnalyst = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_ANALISTA);
  const hasDelivery = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_ENTREGA);
  const hasQuickActions = hasReception || hasAnalyst || hasDelivery;
  const canRegisterPayment = !!session?.user && hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  let sections: Array<{ code: string; name: string }> = [];
  let pendingCount = 0;
  let ordersToday = 0;
  let recentActivity: Array<{ id: string; orderId: string; patientName: string; text: string; createdAt: string }> = [];
  let tableOrdersWithPayment: Parameters<typeof DashboardPendingTable>[0]["orders"] = [];

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    sections = await prisma.labSection.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { code: true, name: true },
    });

    let pendingOrders: unknown[] = [];
    let recentOrdersForActivity: unknown[] = [];
    if (hasOrders || hasQuickActions) {
      if (hasOrders) {
        pendingCount = await prisma.labOrder.count({ where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } } });
        ordersToday = await prisma.labOrder.count({ where: { createdAt: { gte: startOfToday } } });
      }
      if (hasOrders) {
        pendingOrders = await prisma.labOrder.findMany({
          where: { status: { in: ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "ENTREGADO"] } },
          include: {
            patient: true,
            items: { include: { labTest: { include: { section: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 80,
        });
        recentOrdersForActivity = await prisma.labOrder.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { patient: true },
        });
      }
    }

    const patientName = (o: { patient: { firstName: string; lastName: string } }) =>
      `${o.patient.lastName} ${o.patient.firstName}`.trim() || "Paciente";

    recentActivity =
      hasOrders && Array.isArray(recentOrdersForActivity)
        ? (recentOrdersForActivity as Array<{ id: string; createdAt: Date; status: string; patient: { firstName: string; lastName: string } }>).map((o) => ({
            id: `a-${o.id}`,
            orderId: o.id,
            patientName: patientName(o),
            text:
              o.status === "ENTREGADO"
                ? `Se entregó a ${patientName(o)}`
                : o.status === "COMPLETADO"
                  ? `Se completó para ${patientName(o)}`
                  : `Se creó orden para ${patientName(o)}`,
            createdAt: (o as { createdAt: Date }).createdAt.toISOString(),
          }))
        : [];

    const tableOrders = Array.isArray(pendingOrders)
      ? (pendingOrders as Array<{
          id: string;
          orderCode: string;
          createdAt: Date;
          deliveredAt?: Date | null;
          status: string;
          patient: { firstName: string; lastName: string };
          items: Array<{ status: string; labTest: { section: { code: string }; name: string } }>;
          requestedBy?: string | null;
          totalPrice: unknown;
        }>).map((o) => {
          const totalTests = o.items.length;
          const completedTests = o.items.filter((i) => i.status === "COMPLETADO").length;
          const needsValidation =
            completedTests === totalTests && !["COMPLETADO", "ENTREGADO"].includes(o.status);
          return {
            id: o.id,
            orderCode: o.orderCode,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt ?? undefined,
            status: toDashboardOrderStatus(o.status),
            patient: o.patient,
            items: o.items,
            requestedBy: o.requestedBy,
            totalPrice: Number(o.totalPrice),
            itemsSection: o.items[0]?.labTest?.section?.code ?? undefined,
            totalTests,
            completedTests,
            needsValidation,
            missingCount: totalTests - completedTests,
          };
        })
      : [];

    const pendingOrderIds = tableOrders.map((o) => o.id);
    const paidByOrder =
      pendingOrderIds.length > 0 ? await getPaidTotalsByOrderIds(prisma, pendingOrderIds) : new Map<string, number>();

    tableOrdersWithPayment = tableOrders.map((order) => {
      const paid = paidByOrder.get(order.id) ?? 0;
      const total = order.totalPrice;
      const paymentStatus = paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
      return { ...order, paymentStatus: paymentStatus as "PENDIENTE" | "PARCIAL" | "PAGADO" };
    }) as Parameters<typeof DashboardPendingTable>[0]["orders"];
  } catch (error) {
    logger.error("Dashboard data load failed:", error);
    // Fallback seguro: evitamos que la página entera caiga por errores transitorios de DB.
    sections = [];
    pendingCount = 0;
    ordersToday = 0;
    recentActivity = [];
    tableOrdersWithPayment = [];
  }

  const showAnyMetrics = hasOrders;
  const metricCards: React.ReactNode[] = [];

  if (hasOrders) {
    metricCards.push(
      <MetricCard
        key="pending"
        title="Pendientes"
        value={pendingCount}
        subtitle="por capturar / validar"
        icon={<ClipboardList className="h-5 w-5" />}
        accent="amber"
      />,
      <MetricCard
        key="orders-today"
        title="Órdenes hoy"
        value={ordersToday}
        subtitle="creadas hoy"
        icon={<Calendar className="h-5 w-5" />}
        accent="emerald"
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* Header compacto + acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumen</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {(hasQuickActions || canRegisterPayment || hasPatients) && (
          <QuickActions
            sectionOptions={sections.map((s) => ({ value: s.code, label: s.name }))}
            hasPatients={hasPatients}
          />
        )}
      </div>

      {/* Métricas */}
      {showAnyMetrics && metricCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {metricCards}
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid gap-5 md:grid-cols-1 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {hasOrders && (
            <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-4 dark:border-slate-800">
                <CardTitle className="text-sm font-semibold">Órdenes</CardTitle>
                <Link
                  href="/pending"
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                >
                  Ver todas
                </Link>
              </CardHeader>
              <CardContent>
                <DashboardPendingTable
                  orders={tableOrdersWithPayment}
                  defaultFilters={{
                    status: params.pendingStatus ?? "",
                    dateRange: params.pendingDate ?? "7d",
                    section: params.pendingSection ?? "",
                  }}
                  sectionOptions={[
                    { value: "", label: "Todas las secciones" },
                    ...sections.map((s) => ({ value: s.code, label: s.name })),
                  ]}
                />
              </CardContent>
            </Card>
          )}

          {!hasOrders && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No tienes acceso a órdenes. Contacta al administrador para asignar permisos.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actividad reciente */}
        <Card className="border-slate-200/80 dark:border-slate-700/80">
          <CardHeader className="border-b border-slate-100 py-4 dark:border-slate-800">
            <CardTitle className="text-sm font-semibold">Actividad</CardTitle>
          </CardHeader>
          <CardContent>
            {hasOrders && recentActivity.length > 0 ? (
              <RecentActivity items={recentActivity} />
            ) : (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay actividad reciente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
