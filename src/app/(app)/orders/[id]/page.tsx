import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderItemResultDialog } from "@/components/orders/OrderItemResultDialog";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";
import { parseSelectOptions } from "@/lib/json-helpers";
import { getTemplateItemsForPatient } from "@/lib/template-helpers";

type Props = { params: { id: string } };

export default async function OrderDetailPage({ params }: Props) {
  const order = await prisma.labOrder.findFirst({
    where: { id: params.id },
    include: {
      patient: true,
      items: {
        include: {
          labTest: { include: { template: { include: { items: true } } } },
          result: { include: { items: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Orden {order.orderCode}</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              Cambiar estado de la orden
            </p>
          </div>
          <OrderStatusActions orderId={order.id} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Paciente</p>
              <p className="text-base font-semibold text-slate-900">
                {order.patient.firstName} {order.patient.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fecha</p>
              <p className="text-base font-semibold text-slate-900">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Estado</p>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Solicitante</p>
              <p className="text-base font-semibold text-slate-900">
                {order.requestedBy || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-base font-semibold text-slate-900">
                {formatCurrency(Number(order.totalPrice))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Análisis solicitados</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p>No hay análisis solicitados en esta orden.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Análisis</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Resultados</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.labTest.code} - {item.labTest.name}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{item.labTest.section}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.result ? (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-700">
                        {item.result.items.length} parámetros
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="bg-amber-100 text-amber-700">
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(item.priceSnapshot))}</TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      // Determinar qué plantilla usar
                      const templateItems = item.result
                        ? (() => {
                            const templateItemsFromSnapshot = getTemplateItemsForPatient(
                              item.templateSnapshot,
                              item.labTest.template
                                ? {
                                    items: item.labTest.template.items.map((t) => ({
                                      id: t.id,
                                      groupName: t.groupName,
                                      paramName: t.paramName,
                                      unit: t.unit,
                                      refRangeText: t.refRangeText,
                                      refMin: t.refMin ? Number(t.refMin) : null,
                                      refMax: t.refMax ? Number(t.refMax) : null,
                                      valueType: t.valueType as "NUMBER" | "TEXT" | "SELECT",
                                      selectOptions: parseSelectOptions(t.selectOptions),
                                      order: t.order,
                                    })),
                                  }
                                : null,
                            );
                            
                            return item.result!.items.map((r, idx) => {
                              const originalItem = templateItemsFromSnapshot.find(
                                (t) => t.id === r.templateItemId,
                              );
                              
                              return {
                                id: r.templateItemId || `snapshot-${idx}`,
                                groupName: originalItem?.groupName || null,
                                paramName: r.paramNameSnapshot,
                                unit: r.unitSnapshot,
                                refRangeText: r.refTextSnapshot,
                                refMin: r.refMinSnapshot ? Number(r.refMinSnapshot) : null,
                                refMax: r.refMaxSnapshot ? Number(r.refMaxSnapshot) : null,
                                valueType: (originalItem?.valueType || "NUMBER") as "NUMBER" | "TEXT" | "SELECT",
                                selectOptions: originalItem?.selectOptions || [],
                                order: r.order,
                              };
                            });
                          })()
                        : getTemplateItemsForPatient(
                            item.templateSnapshot,
                            item.labTest.template
                              ? {
                                  items: item.labTest.template.items.map((t) => ({
                                    id: t.id,
                                    groupName: t.groupName,
                                    paramName: t.paramName,
                                    unit: t.unit,
                                    refRangeText: t.refRangeText,
                                    refMin: t.refMin ? Number(t.refMin) : null,
                                    refMax: t.refMax ? Number(t.refMax) : null,
                                    valueType: t.valueType as "NUMBER" | "TEXT" | "SELECT",
                                    selectOptions: parseSelectOptions(t.selectOptions),
                                    order: t.order,
                                  })),
                                }
                              : null,
                          );

                      // Obtener plantilla original como fallback (convertir selectOptions de string a string[])
                      const originalTemplateItems = item.labTest.template
                        ? getTemplateItemsForPatient(
                            null,
                            {
                              items: item.labTest.template.items.map((t) => ({
                                id: t.id,
                                groupName: t.groupName,
                                paramName: t.paramName,
                                unit: t.unit,
                                refRangeText: t.refRangeText,
                                refMin: t.refMin ? Number(t.refMin) : null,
                                refMax: t.refMax ? Number(t.refMax) : null,
                                valueType: t.valueType as "NUMBER" | "TEXT" | "SELECT",
                                selectOptions: parseSelectOptions(t.selectOptions),
                                order: t.order,
                              })),
                            },
                          )
                        : [];

                      // Usar templateItems si tiene datos, sino usar originalTemplateItems
                      const finalTemplateItems =
                        templateItems.length > 0 ? templateItems : originalTemplateItems;

                      // Mostrar botón si hay plantilla disponible (original o snapshot)
                      if (finalTemplateItems.length > 0 || item.labTest.template) {
                        return (
                          <OrderItemResultDialog
                            orderId={order.id}
                            itemId={item.id}
                            testName={item.labTest.name}
                            testCode={item.labTest.code}
                            templateItems={finalTemplateItems}
                            existing={
                              item.result
                                ? {
                                    reportedBy: item.result.reportedBy,
                                    comment: item.result.comment,
                                    items: item.result.items.map((r) => ({
                                      templateItemId: r.templateItemId,
                                      paramNameSnapshot: r.paramNameSnapshot,
                                      unitSnapshot: r.unitSnapshot,
                                      refTextSnapshot: r.refTextSnapshot,
                                      refMinSnapshot: r.refMinSnapshot
                                        ? Number(r.refMinSnapshot)
                                        : null,
                                      refMaxSnapshot: r.refMaxSnapshot
                                        ? Number(r.refMaxSnapshot)
                                        : null,
                                      value: r.value,
                                      isOutOfRange: r.isOutOfRange,
                                      order: r.order,
                                    })),
                                  }
                                : undefined
                            }
                          />
                        );
                      }

                      return (
                        <span className="text-xs text-slate-400">
                          Sin plantilla
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
