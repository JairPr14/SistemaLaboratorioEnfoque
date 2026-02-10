import Link from "next/link";

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ id: string }> };

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  const [patient, orders] = await Promise.all([
    prisma.patient.findFirst({
      where: { id, deletedAt: null },
    }),
    prisma.labOrder.findMany({
      where: { patientId: id },
      include: {
        items: {
          include: {
            labTest: true,
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
      <Card>
        <CardHeader>
          <CardTitle>Editar paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm
            patientId={patient.id}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Análisis realizados</CardTitle>
          <Link
            href="/orders/new"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Nueva orden
          </Link>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p>Este paciente aún no tiene órdenes ni análisis registrados.</p>
              <Link
                href="/orders/new"
                className="mt-2 inline-block text-sm font-medium text-slate-900 hover:underline"
              >
                Crear primera orden
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-slate-200 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {order.orderCode}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {order.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </span>
                      <Link
                        href={`/orders/${order.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-600 hover:underline"
                      >
                        PDF
                      </Link>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Análisis</TableHead>
                        <TableHead>Sección</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-slate-500 text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {item.labTest.code} - {item.labTest.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {item.labTest.section}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.result && (item.result.items?.length ?? 0) > 0 ? (
                              <Badge variant="success" className="bg-emerald-100 text-emerald-700 text-xs">
                                {item.result.items?.length ?? 0} parámetros
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Pendiente</span>
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
