import Link from "next/link";
import { Plus } from "lucide-react";
import { getServerSession } from "next-auth";

import { notFound } from "next/navigation";

import { authOptions, hasPermission, PERMISSION_EDITAR_PACIENTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canEditPatient = hasPermission(session, PERMISSION_EDITAR_PACIENTES);
  const [patient, orders] = await Promise.all([
    prisma.patient.findFirst({
      where: { id, deletedAt: null },
    }),
    prisma.labOrder.findMany({
      where: { patientId: id },
      include: {
        items: {
          include: {
            labTest: { include: { section: true } },
            result: { include: { items: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!patient) {
    notFound();
  }

  const birthDate = patient.birthDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
        <PatientForm
            patientId={patient.id}
            canEdit={canEditPatient}
            defaultValues={{
              code: patient.code,
              dni: patient.dni,
              firstName: patient.firstName,
              lastName: patient.lastName,
              birthDate,
              sex: patient.sex,
              phone: patient.phone ?? "",
              address: patient.address ?? "",
              email: patient.email ?? "",
            }}
          />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Análisis realizados</CardTitle>
          <Link
            href={`/orders/new?patientId=${patient.id}`}
            className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          >
            <Plus className="h-4 w-4" />
            Nueva orden
          </Link>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Plus className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mb-4 text-slate-600 dark:text-slate-400">
                Este paciente aún no tiene órdenes ni análisis registrados.
              </p>
              <Link
                href={`/orders/new?patientId=${patient.id}`}
                className={cn(buttonVariants({ size: "lg" }), "gap-2 inline-flex")}
              >
                <Plus className="h-4 w-4" />
                Crear primera orden
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-100 dark:border-slate-600">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {order.orderCode}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {order.status}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(order.createdAt)}
                      </span>
                      <Link
                        href={`/orders/${order.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        PDF
                      </Link>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-700/50">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Análisis</TableHead>
                        <TableHead>Sección</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {item.labTest.code} - {item.labTest.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {item.labTest.section?.name ?? item.labTest.section?.code ?? ""}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.result && (item.result.items?.length ?? 0) > 0 ? (
                              <Badge variant="success" className="text-xs">
                                {item.result.items?.length ?? 0} parámetros
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">Pendiente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
