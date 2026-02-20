import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  ClipboardList,
  TestTube,
  Calendar,
  Clock,
  UserPlus,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { QuickOrderButton } from "@/components/dashboard/QuickOrderButton";
import { DashboardPendingTable } from "@/components/dashboard/DashboardPendingTable";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    patientsCount,
    ordersCount,
    pendingCount,
    testsCount,
    ordersToday,
    pendingOrders,
    recentOrdersForActivity,
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.labOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.labOrder.count({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO"] } },
    }),
    prisma.labTest.count({ where: { deletedAt: null, isActive: true } }),
    prisma.labOrder.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.labOrder.findMany({
      where: { status: { in: ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "ENTREGADO"] } },
      include: {
        patient: true,
        items: {
          include: { labTest: { select: { name: true, section: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.labOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { patient: true },
    }),
  ]);

  const patientName = (o: { patient: { firstName: string; lastName: string } }) =>
    `${o.patient.lastName} ${o.patient.firstName}`.trim() || "Paciente";

  const recentActivity = recentOrdersForActivity.map((o) => ({
    id: `a-${o.id}`,
    orderId: o.id,
    patientName: patientName(o),
    text:
      o.status === "ENTREGADO"
        ? `Se entregó a ${patientName(o)}`
        : o.status === "COMPLETADO"
          ? `Se completó para ${patientName(o)}`
          : `Se creó orden para ${patientName(o)}`,
    createdAt: o.createdAt.toISOString(),
  }));

  const tableOrders = pendingOrders.map((o) => {
    const totalTests = o.items.length;
    const completedTests = o.items.filter((i) => i.status === "COMPLETADO").length;
    const needsValidation =
      completedTests === totalTests &&
      !["COMPLETADO", "ENTREGADO"].includes(o.status);
    const missingCount = totalTests - completedTests;
    return {
      id: o.id,
      orderCode: o.orderCode,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt ?? undefined,
      status: o.status,
      patient: o.patient,
      items: o.items,
      requestedBy: o.requestedBy,
      itemsSection: o.items[0]?.labTest?.section ?? undefined,
      totalTests,
      completedTests,
      needsValidation,
      missingCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header: CTAs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <QuickOrderButton />
          <Link href="/patients">
            <Button variant="outline" size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Paciente
            </Button>
          </Link>
        </div>
      </div>

      {/* Acciones rápidas */}
      <QuickActionsBar />

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          title="Pacientes activos"
          value={patientsCount}
          subtitle="registrados"
          icon={<Users className="h-5 w-5" />}
          accent="teal"
        />
        <MetricCard
          title="Órdenes (mes)"
          value={ordersCount}
          subtitle="este mes"
          icon={<FileText className="h-5 w-5" />}
          accent="blue"
        />
        <MetricCard
          title="Pendientes"
          value={pendingCount}
          subtitle="por capturar / validar"
          icon={<ClipboardList className="h-5 w-5" />}
          accent="amber"
        />
        <MetricCard
          title="Análisis en catálogo"
          value={testsCount}
          subtitle="activos"
          icon={<TestTube className="h-5 w-5" />}
          accent="violet"
        />
        <MetricCard
          title="Órdenes hoy"
          value={ordersToday}
          subtitle="creadas hoy"
          icon={<Calendar className="h-5 w-5" />}
          accent="emerald"
        />
        <MetricCard
          title="Tiempo promedio"
          value="24h"
          subtitle="entrega estimada"
          icon={<Clock className="h-5 w-5" />}
          accent="sky"
        />
      </div>

      {/* Pendientes + Actividad reciente */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pendientes y recientes</CardTitle>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                Pendientes, en curso, completados y entregados — información rápida a la mano
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
            <DashboardPendingTable orders={tableOrders} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay actividad reciente
              </p>
            ) : (
              <RecentActivity items={recentActivity} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
