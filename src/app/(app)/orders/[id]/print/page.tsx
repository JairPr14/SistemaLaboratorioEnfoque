import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

type Props = { params: { id: string } };

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default async function OrderPrintPage({ params }: Props) {
  const order = await prisma.labOrder.findFirst({
    where: { id: params.id },
    include: {
      patient: true,
      items: {
        include: {
          labTest: { include: { template: true } },
          result: { include: { items: { orderBy: { order: "asc" } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Agrupar items por sección
  const itemsBySection = order.items.reduce(
    (acc, item) => {
      const section = item.labTest.section;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, typeof order.items>,
  );

  const age = calculateAge(order.patient.birthDate);
  const sexLabel = order.patient.sex === "M" ? "Masculino" : order.patient.sex === "F" ? "Femenino" : "Otro";

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-slate-900 print:p-6 print-avoid-break">
      {/* Encabezado */}
      <div className="mb-6 border-b-2 border-slate-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SISTEMA LIS</h1>
            <p className="text-sm text-slate-600 mt-1">Laboratorio Clínico</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">REPORTE DE LABORATORIO</p>
            <p className="text-xs text-slate-500 mt-1">N° {order.orderCode}</p>
            <p className="text-xs text-slate-400 mt-1 italic">
              Resultados personalizados para el paciente
            </p>
          </div>
        </div>
      </div>

      {/* Información del paciente y orden */}
      <div className="mb-6 grid grid-cols-2 gap-6 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div>
            <span className="text-xs font-semibold text-slate-600">PACIENTE:</span>
            <span className="ml-2 text-sm font-medium text-slate-900">
              {order.patient.lastName.toUpperCase()} {order.patient.firstName.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">EDAD:</span>
            <span className="ml-2 text-sm text-slate-900">{age} Años</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">DNI:</span>
            <span className="ml-2 text-sm text-slate-900">{order.patient.dni}</span>
          </div>
          {order.requestedBy && (
            <div>
              <span className="text-xs font-semibold text-slate-600">INDICACIÓN:</span>
              <span className="ml-2 text-sm text-slate-900">{order.requestedBy}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-semibold text-slate-600">SEXO:</span>
            <span className="ml-2 text-sm text-slate-900">{sexLabel}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">FECHA:</span>
            <span className="ml-2 text-sm text-slate-900">{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">N° REGISTRO:</span>
            <span className="ml-2 text-sm text-slate-900">{order.orderCode}</span>
          </div>
        </div>
      </div>

      {/* Análisis agrupados por sección */}
      <div className="space-y-8">
        {Object.entries(itemsBySection).map(([section, items]) => (
          <div key={section} className="print-avoid-break">
            {/* Título de sección */}
            <div className="mb-4 border-b-2 border-slate-400 pb-2">
              <h2 className="text-center text-lg font-bold uppercase text-slate-900">
                SECCIÓN {section}
              </h2>
            </div>

            {/* Análisis en esta sección */}
            {items.map((item) => {
              const hasResults = item.result && item.result.items.length > 0;
              return (
                <div key={item.id} className="mb-6 break-inside-avoid">
                  {/* Nombre del análisis */}
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-600">ANÁLISIS:</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.labTest.code} - {item.labTest.name}
                    </p>
                  </div>

                  {/* Tabla de resultados */}
                  {hasResults ? (
                    <div className="border border-slate-300">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b-2 border-slate-400 bg-slate-100">
                            <th className="px-3 py-2 text-left font-semibold text-slate-900">
                              ANÁLISIS
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-900">
                              RESULTADOS
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-900">
                              UNIDAD
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-900">
                              VALOR REFERENCIAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.result!.items.map((res, idx) => {
                            // Agrupar por grupoName si existe
                            const showGroupHeader =
                              idx === 0 ||
                              (item.result!.items[idx - 1] &&
                                res.paramNameSnapshot !== item.result!.items[idx - 1].paramNameSnapshot);

                            return (
                              <tr key={res.id} className="border-b border-slate-200">
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {res.paramNameSnapshot}
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-900">
                                  {res.value}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {res.unitSnapshot || "-"}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {res.refTextSnapshot || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-slate-300 p-4 text-center text-sm text-slate-500">
                      Sin resultados registrados.
                    </div>
                  )}

                  {/* Comentario del análisis */}
                  {item.result?.comment && (
                    <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                      <span className="font-semibold">Observación:</span> {item.result.comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Pie de página con firma */}
      <div className="mt-12 border-t-2 border-slate-300 pt-6">
        <div className="flex items-end justify-between">
          <div className="text-xs text-slate-500">
            {order.deliveredAt && (
              <p>Fecha de entrega: {formatDate(order.deliveredAt)}</p>
            )}
            {order.items[0]?.result?.reportedBy && (
              <p className="mt-1">Reportado por: {order.items[0].result.reportedBy}</p>
            )}
          </div>
          <div className="text-center">
            <div className="mb-2 h-20 w-64 border-b-2 border-slate-400"></div>
            <p className="text-xs font-semibold text-slate-700">Firma y sello</p>
            <p className="mt-1 text-xs text-slate-500">Responsable técnico</p>
          </div>
        </div>
      </div>

      {/* Footer con información de contacto */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        <p>Página 1 de 1</p>
      </div>
    </div>
  );
}
