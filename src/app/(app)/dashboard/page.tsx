import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession, hasPermission, isAdmissionOnlyProfile, isReceptionProfile } from "@/lib/auth";
import {
  PERMISSION_VER_ADMISION,
  PERMISSION_GESTIONAR_ADMISION,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, Calendar } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardCTAs } from "@/components/dashboard/DashboardCTAs";
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

  if (session?.user) {
    if (isAdmissionOnlyProfile(session)) redirect("/admission");
    if (isReceptionProfile(session)) redirect("/orders");
  }

  const hasAdmission = !!session?.user && (hasPermission(session, PERMISSION_VER_ADMISION) || hasPermission(session, PERMISSION_GESTIONAR_ADMISION));
  const canManageAdmission = !!session?.user && hasPermission(session, PERMISSION_GESTIONAR_ADMISION);
  const hasOrders = !!session?.user && hasPermission(session, PERMISSION_VER_ORDENES);
  const hasPatients = !!session?.user && hasPermission(session, PERMISSION_VER_PACIENTES);
  const hasCatalog = !!session?.user && hasPermission(session, PERMISSION_VER_CATALOGO);
  const hasReception = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_RECEPCION);
  const hasAnalyst = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_ANALISTA);
  const hasDelivery = !!session?.user && hasPermission(session, PERMISSION_QUICK_ACTIONS_ENTREGA);
  const hasQuickActions = hasReception || hasAnalyst || hasDelivery;
  const canRegisterPayment = !!session?.user && hasPermission(session, PERMISSION_REGISTRAR_PAGOS);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sectionsPromise = prisma.labSection.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const labDataPromise =
    hasOrders || hasQuickActions
      ? Promise.all([
          hasPatients ? prisma.patient.count({ where: { deletedAt: null } }) : 0,
          hasOrders ? prisma.labOrder.count({ where: { createdAt: { gte: startOfMonth } } }) : 0,
          hasOrders ? prisma.labOrder.count({ where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } } }) : 0,
          hasCatalog ? prisma.labTest.count({ where: { deletedAt: null, isActive: true } }) : 0,
          hasOrders ? prisma.labOrder.count({ where: { createdAt: { gte: startOfToday } } }) : 0,
          hasOrders
            ? prisma.labOrder.findMany({
                where: { status: { in: ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "ENTREGADO"] } },
                include: {
                  patient: true,
                  items: { include: { labTest: { include: { section: true } } } },
                },
                orderBy: { createdAt: "desc" },
                take: 80,
              })
            : [],
          hasOrders
            ? prisma.labOrder.findMany({
                orderBy: { createdAt: "desc" },
                take: 12,
                include: { patient: true },
              })
            : [],
        ])
      : Promise.resolve([0, 0, 0, 0, 0, [], []] as const);

  const [sections, labData] = await Promise.all([
    sectionsPromise,
    labDataPromise,
  ]);

  const [, , pendingCount, , ordersToday, pendingOrders, recentOrdersForActivity] =
    hasOrders || hasQuickActions
      ? (labData as [number, number, number, number, number, unknown[], unknown[]])
      : [0, 0, 0, 0, 0, [], []];

  const patientName = (o: { patient: { firstName: string; lastName: string } }) =>
    `${o.patient.lastName} ${o.patient.firstName}`.trim() || "Paciente";

  const recentActivity =
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
  const tableOrdersWithPayment = tableOrders.map((order) => {
    const paid = paidByOrder.get(order.id) ?? 0;
    const total = order.totalPrice;
    const paymentStatus = paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
    return { ...order, paymentStatus: paymentStatus as "PENDIENTE" | "PARCIAL" | "PAGADO" };
  }) as Parameters<typeof DashboardPendingTable>[0]["orders"];

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
    <div className="min-w-0 space-y-6">
      {/* Encabezado del dashboard */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-6 py-5 dark:border-slate-700/80 dark:from-slate-900/50 dark:to-slate-800/30">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Resumen
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 capitalize">
          {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* CTAs según rol: admisión primero, luego laboratorio */}
      <DashboardCTAs
        hasAdmission={hasAdmission}
        hasOrdersOrReception={hasOrders || hasReception}
        hasPatients={hasPatients}
        canManageAdmission={canManageAdmission}
      />

      {/* Acciones rápidas: solo si el usuario tiene algún permiso de recepción/analista/entrega/pagos */}
      {(hasQuickActions || canRegisterPayment) && (
        <QuickActions
          sectionOptions={sections.map((s) => ({ value: s.code, label: s.name }))}
        />
      )}

      {/* Métricas: solo las que aplican al rol */}
      {showAnyMetrics && metricCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards}
        </div>
      )}

      {/* Contenido principal: tabla de órdenes */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {hasOrders && (
            <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                <div>
                  <CardTitle className="text-base">Pendientes y recientes</CardTitle>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Órdenes pendientes, en curso, completados y entregados
                  </p>
                </div>
                <Link
                  href="/pending"
                  className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline shrink-0 transition-colors"
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

          {!hasAdmission && !hasOrders && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No tienes acceso a admisión ni a órdenes. Contacta al administrador para asignar permisos.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actividad reciente */}
        <Card className="border-slate-200/80 dark:border-slate-700/80">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Actividad reciente</CardTitle>
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
