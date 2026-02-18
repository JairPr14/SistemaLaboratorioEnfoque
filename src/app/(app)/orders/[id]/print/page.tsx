import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { getPrintConfig } from "@/lib/print-config";
import { PrintActions } from "@/components/orders/PrintActions";
import { PrintFitToPage } from "@/components/orders/PrintFitToPage";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ items?: string }>;
};

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Forma mínima del order que usan PatientDataBlock y FooterBlock
type OrderForPrint = {
  patient: { lastName: string; firstName: string; dni: string; birthDate: Date; sex: string | null };
  requestedBy: string | null;
  createdAt: Date;
  orderCode: string;
  deliveredAt: Date | null;
  items: Array<{
    id: string;
    result: { reportedBy?: string | null } | null;
  }>;
};

type RefRangeItem = { ageGroup?: string | null; sex?: string | null; refRangeText?: string | null; refMin?: number | null; refMax?: number | null };

function PatientDataBlock({
  order,
  age,
  sexLabel,
}: {
  order: OrderForPrint;
  age: number;
  sexLabel: string;
}) {
  return (
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
  );
}

function FooterBlock({
  items,
  order,
  showStamp,
  stampImageUrl,
}: {
  items: OrderForPrint["items"];
  order: OrderForPrint;
  showStamp: boolean;
  stampImageUrl: string | null;
}) {
  return (
    <div className="mt-10 pt-6 border-t-2 border-slate-300 flex flex-wrap items-end justify-between gap-6">
      <div className="text-xs text-slate-500">
        {items[0]?.result?.reportedBy && (
          <p>Reportado por: {items[0].result.reportedBy}</p>
        )}
        {order.deliveredAt && (
          <p className="mt-1">Fecha de entrega: {formatDate(order.deliveredAt)}</p>
        )}
      </div>
      <div className="text-center flex flex-col items-center gap-2">
        {showStamp && stampImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={stampImageUrl}
            alt=""
            className="print-stamp h-20 w-auto object-contain opacity-90"
            style={{ maxWidth: "140px" }}
          />
        )}
        <div className="w-56 h-16 border-b-2 border-slate-400 mb-1" />
        <p className="text-xs font-semibold text-slate-700">
          T.M / Responsable técnico
        </p>
        <p className="text-xs text-slate-500">CTMP</p>
      </div>
    </div>
  );
}

export default async function OrderPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { items: itemsParam } = await searchParams;
  const selectedItemIds = itemsParam
    ? new Set(itemsParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: {
      patient: true,
      items: {
        include: {
          labTest: { 
            include: { 
              template: { 
                include: { 
                  items: {
                    include: {
                      refRanges: {
                        orderBy: { order: "asc" }
                      }
                    }
                  }
                } 
              } 
            } 
          },
          result: { include: { items: { orderBy: { order: "asc" } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Filtrar items si se especificaron IDs seleccionados
  const itemsToPrint =
    selectedItemIds && selectedItemIds.size > 0
      ? order.items.filter((item) => selectedItemIds.has(item.id))
      : order.items;

  // Agrupar items por sección
  const itemsBySection = itemsToPrint.reduce(
    (acc, item) => {
      const section = item.labTest.section;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, typeof itemsToPrint>,
  );

  const age = calculateAge(order.patient.birthDate);
  const sexLabel = order.patient.sex === "M" ? "Masculino" : order.patient.sex === "F" ? "Femenino" : "Otro";
  const sectionsEntries = Object.entries(itemsBySection);
  const printConfig = await getPrintConfig();
  const showStamp = printConfig.stampEnabled && printConfig.stampImageUrl;

  // Si no hay secciones (sin items o items vacíos), mostramos una hoja con mensaje
  const hasSections = sectionsEntries.length > 0;

  return (
    <>
      <PrintActions />
      <PrintFitToPage />
      {hasSections ? sectionsEntries.map(([section, items], index) => (
        <div
          key={section}
          className={`print-a4 relative mx-auto bg-white text-slate-900 print:mx-0 print:shadow-none overflow-hidden ${index < sectionsEntries.length - 1 ? "print-page" : ""} ${index > 0 ? "mt-8 print:mt-0" : ""}`}
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
              {/* Espacio de encabezado */}
              <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]">
                <div className="min-w-0 flex-1" aria-hidden />
                <div className="min-w-0 flex-1" aria-hidden />
              </header>

              <PatientDataBlock order={order} age={age} sexLabel={sexLabel} />

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
                      {item.labTest.name}
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
                              <th className="text-left py-2 px-3 font-semibold text-slate-900 w-[180px]">
                                VALOR REFERENCIAL
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.result!.items.map((res) => {
                              // Buscar el templateItem original para obtener refRanges
                              const templateItem = res.templateItemId 
                                ? item.labTest.template?.items.find((t) => t.id === res.templateItemId)
                                : null;
                              const refRanges: RefRangeItem[] = (templateItem && "refRanges" in templateItem ? (templateItem.refRanges as RefRangeItem[]) : []) ?? [];
                              
                              return (
                                <tr key={res.id} className="border-b border-slate-200 last:border-b-0">
                                  <td className="py-2 px-3 font-medium text-slate-900 align-top">
                                    {res.paramNameSnapshot}
                                  </td>
                                  <td
                                    className={`py-2 px-3 font-semibold text-slate-900 align-top ${
                                      res.isOutOfRange ? "font-bold underline" : ""
                                    }`}
                                  >
                                    {res.value}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 align-top">
                                    {res.unitSnapshot || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 w-[180px] align-top">
                                    <div className="space-y-1">
                                      {res.refTextSnapshot && (
                                        <div className="font-medium">
                                          {res.refTextSnapshot}
                                        </div>
                                      )}
                                      {refRanges.length > 0 && (
                                        <div className="space-y-0.5 text-[10px]">
                                          {refRanges.map((range: RefRangeItem, rangeIdx: number) => {
                                            const ageGroupLabels: Record<string, string> = {
                                              NIÑOS: "Niños",
                                              JOVENES: "Jóvenes",
                                              ADULTOS: "Adultos",
                                            };
                                            const sexLabels: Record<string, string> = {
                                              M: "Hombres",
                                              F: "Mujeres",
                                              O: "Otros",
                                            };
                                            const criteria = [
                                              range.ageGroup ? ageGroupLabels[range.ageGroup] || range.ageGroup : null,
                                              range.sex ? sexLabels[range.sex] || range.sex : null,
                                            ].filter(Boolean);
                                            
                                            const rangeDisplay = range.refRangeText 
                                              || (range.refMin !== null && range.refMax !== null 
                                                ? `${range.refMin} - ${range.refMax}` 
                                                : "");
                                            
                                            return (
                                              <div key={rangeIdx} className="leading-tight">
                                                {criteria.length > 0 ? (
                                                  <span>
                                                    <span className="font-semibold text-slate-800">
                                                      {criteria.join(" + ")}:
                                                    </span>
                                                    <span className="text-slate-600 ml-1">{rangeDisplay}</span>
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-600">{rangeDisplay}</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {!res.refTextSnapshot && refRanges.length === 0 ? (
                                        <span className="font-medium">-</span>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
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

              <FooterBlock items={items} order={order} showStamp={!!(showStamp && printConfig.stampImageUrl)} stampImageUrl={printConfig.stampImageUrl} />

              <div className="mt-6 pt-3 text-center text-xs min-h-[1.5rem]" aria-hidden />
            </div>
          </div>
        </div>
      )) : (
        <div
          className="print-a4 relative mx-auto bg-white text-slate-900 print:mx-0 print:shadow-none overflow-hidden"
          style={{ width: "210mm", height: "297mm" }}
        >
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
          <div className="print-a4-scaler absolute top-0 left-0 w-full z-10" style={{ width: "210mm" }}>
            <div
              className="print-a4-content relative px-6 print:px-4"
              style={{ paddingTop: "29.7mm", paddingBottom: "29.7mm" }}
            >
              <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]" />
              <PatientDataBlock order={order} age={age} sexLabel={sexLabel} />
              <p className="text-center text-slate-500 py-12">No hay análisis seleccionados para imprimir.</p>
              <FooterBlock items={[]} order={order} showStamp={!!(showStamp && printConfig.stampImageUrl)} stampImageUrl={printConfig.stampImageUrl} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
