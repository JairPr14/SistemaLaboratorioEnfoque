import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatWithThousands } from "@/lib/formatNumber";
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

// Forma mínima del order que usan PatientDataBlock y FooterBlock (sin datos de cobro)
type OrderForPrint = {
  patient: { lastName: string; firstName: string; dni: string; birthDate: Date; sex: string | null };
  requestedBy: string | null;
  preAnalyticNote?: string | null;
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

function ReferredHeaderBlock({ referredLab }: { referredLab: { name: string; logoUrl: string | null } }) {
  return (
    <div className="flex items-center justify-center gap-2 flex-1">
      <span className="text-xs font-medium text-slate-600">Con el respaldo de</span>
      {referredLab.logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={referredLab.logoUrl}
          alt={referredLab.name}
          className="h-10 w-auto object-contain max-w-[100px]"
        />
      ) : (
        <span className="text-sm font-semibold text-slate-700">{referredLab.name}</span>
      )}
    </div>
  );
}

function FooterBlock({
  items,
  order,
  showStamp,
  stampImageUrl,
  referredLabStampUrl,
}: {
  items: OrderForPrint["items"];
  order: OrderForPrint;
  showStamp: boolean;
  stampImageUrl: string | null;
  referredLabStampUrl?: string | null;
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
      <div className="flex flex-row items-end justify-end gap-8">
        {referredLabStampUrl && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-40 h-14 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referredLabStampUrl}
                alt="Sello laboratorio referido"
                className="max-h-full max-w-full w-auto h-auto object-contain opacity-90"
              />
            </div>
            <div className="w-40 h-14 border-b-2 border-slate-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700">Firma</p>
            <p className="text-xs text-slate-500">Responsable laboratorio referido</p>
          </div>
        )}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-56 h-16 flex items-center justify-center shrink-0">
            {showStamp && stampImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={stampImageUrl}
                alt=""
                className="print-stamp max-h-full max-w-full w-auto h-auto object-contain opacity-90"
              />
            )}
          </div>
          <div className="w-56 h-16 border-b-2 border-slate-400 mb-1" />
          <p className="text-xs font-semibold text-slate-700">
            T.M / Responsable técnico
          </p>
          <p className="text-xs text-slate-500">CTMP</p>
        </div>
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
              section: true,
              referredLab: true,
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
      const sectionKey = item.labTest.section?.name ?? item.labTest.section?.code ?? "OTROS";
      if (!acc[sectionKey]) {
        acc[sectionKey] = [];
      }
      acc[sectionKey].push(item);
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

  const patientName = `${order.patient.firstName} ${order.patient.lastName}`.trim();
  const analysesNames = itemsToPrint.map((i) => i.labTest.name).join(", ");
  const analysisCodes = itemsToPrint.map((i) => i.labTest.code).join("-");
  const dateStr = formatDate(order.createdAt);

  return (
    <>
      <PrintActions
        patientName={patientName}
        patientPhone={order.patient.phone}
        analysesNames={analysesNames}
        analysisCodes={analysisCodes || order.orderCode}
        date={dateStr}
      />
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
              className="print-a4-content relative px-12"
              style={{ paddingTop: "29.7mm", paddingBottom: "29.7mm" }}
            >
              {/* Encabezado: logos a los lados, "Con el respaldo de" en el centro cuando hay análisis referidos */}
              {(() => {
                const firstReferred = items.find((i) => i.labTest.isReferred && i.labTest.referredLab);
                const referredLab = firstReferred?.labTest.referredLab;
                return (
                  <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]">
                    <div className="min-w-0 flex-1" aria-hidden />
                    {referredLab ? (
                      <ReferredHeaderBlock referredLab={referredLab} />
                    ) : (
                      <div className="min-w-0 flex-1" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1" aria-hidden />
                  </header>
                );
              })()}

              <PatientDataBlock
                order={order}
                age={age}
                sexLabel={sexLabel}
              />

              {/* Barra de sección: fondo semi-transparente, texto en negrita más grande */}
              <div
                className="text-white py-2.5 px-4 mb-3 print-section-bar"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.7)" }}
              >
                <h2 className="text-center text-base font-bold uppercase tracking-wide">
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
                              // Buscar el templateItem original para obtener refRanges y valueType
                              const templateItem = res.templateItemId 
                                ? item.labTest.template?.items.find((t) => t.id === res.templateItemId)
                                : null;
                              let refRanges: RefRangeItem[] = (templateItem && "refRanges" in templateItem ? (templateItem.refRanges as RefRangeItem[]) : []) ?? [];
                              // Fallback: si no hay refRanges en la plantilla actual, usar templateSnapshot (p. ej. órdenes antiguas o plantilla modificada)
                              if (refRanges.length === 0 && item.templateSnapshot && typeof item.templateSnapshot === "object" && "items" in item.templateSnapshot) {
                                const snapshot = item.templateSnapshot as { items: Array<{ id: string; refRanges?: RefRangeItem[] }> };
                                const snapshotItem = snapshot.items.find((t) => t.id === res.templateItemId);
                                refRanges = (snapshotItem?.refRanges ?? []) as RefRangeItem[];
                              }
                              const valueType = (templateItem as { valueType?: string } | null)?.valueType;
                              const isNumeric = ["NUMBER", "DECIMAL", "PERCENTAGE"].includes(valueType ?? "");
                              const displayValue = isNumeric && res.value
                                ? formatWithThousands(res.value) + (valueType === "PERCENTAGE" ? " %" : "")
                                : res.value;
                              
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
                                    {displayValue}
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

              {order.preAnalyticNote && (
                <div className="mt-3 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <p className="font-semibold uppercase tracking-wide text-slate-800">
                    Observaciones preanalíticas
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{order.preAnalyticNote}</p>
                </div>
              )}

              <FooterBlock
                items={items}
                order={order}
                showStamp={!!(showStamp && printConfig.stampImageUrl)}
                stampImageUrl={printConfig.stampImageUrl}
                referredLabStampUrl={(() => {
                  const firstReferred = items.find((i) => i.labTest.isReferred && i.labTest.referredLab);
                  return firstReferred?.labTest.referredLab?.stampImageUrl ?? null;
                })()}
              />

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
              className="print-a4-content relative px-12"
              style={{ paddingTop: "29.7mm", paddingBottom: "29.7mm" }}
            >
              <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]" />
              <PatientDataBlock
                order={order}
                age={age}
                sexLabel={sexLabel}
              />
              <p className="text-center text-slate-500 py-12">No hay análisis seleccionados para imprimir.</p>
              <FooterBlock items={[]} order={order} showStamp={!!(showStamp && printConfig.stampImageUrl)} stampImageUrl={printConfig.stampImageUrl} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
