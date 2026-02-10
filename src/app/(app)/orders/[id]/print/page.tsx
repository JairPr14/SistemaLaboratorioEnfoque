import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PrintActions } from "@/components/orders/PrintActions";
import { PrintFitToPage } from "@/components/orders/PrintFitToPage";

type Props = { params: Promise<{ id: string }> };

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
  const { id } = await params;
  const order = await prisma.labOrder.findFirst({
    where: { id },
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
    <>
      <PrintActions />
      <PrintFitToPage />
      {/* Contenedor A4: altura fija para que el contenido se escale y quepa en una hoja */}
      <div
        className="print-a4 relative mx-auto bg-white text-slate-900 print:mx-0 print:shadow-none overflow-hidden"
        style={{ width: "210mm", height: "297mm" }}
      >
        {/* Fondo de agua: toda la hoja en pantalla e impresión */}
        <div
          className="print-watermark absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url(/watermark-clinica.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          aria-hidden
        />
        {/* Wrapper escalable: permite reducir el contenido para que quepa en una hoja */}
        <div className="print-a4-scaler absolute top-0 left-0 w-full z-10" style={{ width: "210mm" }}>
          <div
            className="print-a4-content relative px-6 print:px-4"
            style={{ paddingTop: "29.7mm", paddingBottom: "29.7mm" }}
          >
        {/* Espacio de encabezado (nombre y lema van en el fondo de agua) */}
        <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]">
          <div className="min-w-0 flex-1" aria-hidden />
          <div className="min-w-0 flex-1" aria-hidden />
        </header>

        {/* Bloque de datos del paciente (estilo informe) */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">PACIENTE:</span>
            <span className="font-semibold text-slate-900 uppercase">
              {order.patient.lastName} {order.patient.firstName}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">EDAD:</span>
            <span>{age} Años</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">DNI:</span>
            <span>{order.patient.dni}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">INDICACIÓN:</span>
            <span>{order.requestedBy || "Médico tratante"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">SEXO:</span>
            <span>{sexLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">FECHA:</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 font-medium shrink-0">N° REGISTRO:</span>
            <span className="font-mono">{order.orderCode}</span>
          </div>
        </div>

        {/* Análisis agrupados por sección */}
        <div className="space-y-6">
          {Object.entries(itemsBySection).map(([section, items]) => (
            <div key={section} className="break-inside-avoid">
              {/* Barra negra con nombre de sección */}
              <div className="bg-slate-900 text-white py-2 px-4 mb-3">
                <h2 className="text-center text-sm font-bold uppercase tracking-wide">
                  SECCIÓN {section}
                </h2>
              </div>

              <p className="text-xs text-slate-600 mb-2 font-medium">ANÁLISIS:</p>

              {items.map((item) => {
                const hasResults = item.result && (item.result.items?.length ?? 0) > 0;
                return (
                  <div key={item.id} className="mb-6 break-inside-avoid">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      {item.labTest.code} - {item.labTest.name}
                    </p>

                    {hasResults ? (
                      <>
                        <table className="w-full text-xs border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                              <th className="text-left py-2 px-3 font-semibold text-slate-900">
                                ANÁLISIS
                              </th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-900">
                                RESULTADOS
                              </th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-900">
                                UNIDAD
                              </th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-900">
                                VALOR REFERENCIAL
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.result!.items.map((res) => (
                              <tr key={res.id} className="border-b border-slate-200 last:border-b-0">
                                <td className="py-2 px-3 font-medium text-slate-900">
                                  {res.paramNameSnapshot}
                                </td>
                                <td
                                  className={`py-2 px-3 font-semibold text-slate-900 ${
                                    res.isOutOfRange ? "font-bold underline" : ""
                                  }`}
                                >
                                  {res.value}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  {res.unitSnapshot || "-"}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  {res.refTextSnapshot || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Descripción / notas del análisis si existen */}
                        {item.result?.comment && (
                          <p className="mt-2 text-xs text-slate-600 italic">
                            {item.result.comment}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="border border-slate-300 py-4 text-center text-sm text-slate-500">
                        Sin resultados registrados.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pie: reportado por y firma */}
        <div className="mt-10 pt-6 border-t-2 border-slate-300 flex flex-wrap items-end justify-between gap-6">
          <div className="text-xs text-slate-500">
            {order.items[0]?.result?.reportedBy && (
              <p>Reportado por: {order.items[0].result.reportedBy}</p>
            )}
            {order.deliveredAt && (
              <p className="mt-1">Fecha de entrega: {formatDate(order.deliveredAt)}</p>
            )}
          </div>
          <div className="text-center">
            <div className="w-56 h-16 border-b-2 border-slate-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700">
              T.M / Responsable técnico
            </p>
            <p className="text-xs text-slate-500">CTMP</p>
          </div>
        </div>

        <div className="mt-6 pt-3 text-center text-xs min-h-[1.5rem]" aria-hidden />
          </div>
        </div>
      </div>
    </>
  );
}
