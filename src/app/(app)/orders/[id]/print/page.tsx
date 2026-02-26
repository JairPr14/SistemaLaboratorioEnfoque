import { Fragment } from "react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatPatientDisplayName } from "@/lib/format";
import { formatWithThousands } from "@/lib/formatNumber";
import { parseSelectOptions } from "@/lib/json-helpers";
import { getPrintConfig } from "@/lib/print-config";
import { PrintActions } from "@/components/orders/PrintActions";
import { PrintFitToPage } from "@/components/orders/PrintFitToPage";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ items?: string; referredLabId?: string }>;
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
  patient: { lastName: string; firstName: string; dni: string | null; birthDate: Date; sex: string | null };
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
  const patientName = formatPatientDisplayName(order.patient.firstName, order.patient.lastName);

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6 min-w-0">
      {/* PACIENTE ocupa toda la fila para nombres largos; EDAD en la siguiente */}
      <div className="col-span-2 flex gap-2 min-w-0">
        <span className="text-slate-500 font-medium shrink-0">PACIENTE:</span>
        <span className="font-semibold text-slate-900 uppercase break-words min-w-0 flex-1">
          {patientName}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="text-slate-500 font-medium shrink-0">EDAD:</span>
        <span>{age} Años</span>
      </div>
      <div className="flex gap-2">
        <span className="text-slate-500 font-medium shrink-0">DNI:</span>
        <span>{order.patient.dni ?? "—"}</span>
      </div>
      <div className="flex gap-2 min-w-0">
        <span className="text-slate-500 font-medium shrink-0">INDICACIÓN:</span>
        <span className="break-words min-w-0">{order.requestedBy || "Médico tratante"}</span>
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
    <div className="flex items-center justify-center gap-2 flex-1 -mt-[50px]	 ml-[65px]">
      {referredLab.logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={referredLab.logoUrl}
          alt={referredLab.name}
          className="h-16 w-auto object-contain max-w-[220px]"
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
        
      </div>
      <div className="flex flex-row items-end justify-end gap-8">
        {referredLabStampUrl && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-40 min-h-[3rem] flex flex-col items-center justify-end border-b-2 border-slate-400 pb-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referredLabStampUrl}
                alt="Sello laboratorio referido"
                className="max-h-14 max-w-full w-auto object-contain opacity-90"
              />
            </div>
            <p className="text-xs font-semibold text-slate-700">Firma</p>
            <p className="text-xs text-slate-500">Responsable laboratorio referido</p>
          </div>
        )}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-56 min-h-[3rem] flex flex-col items-center justify-end border-b-2 border-slate-400 pb-0.5">
            {showStamp && stampImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={stampImageUrl}
                alt=""
                className="print-stamp max-h-14 max-w-full w-auto object-contain opacity-90"
              />
            )}
          </div>
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
  const { items: itemsParam, referredLabId } = await searchParams;
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

  // Laboratorios referidos presentes en los análisis seleccionados
  const referredLabsMap = new Map<
    string,
    { id: string; name: string; logoUrl: string | null; stampImageUrl: string | null }
  >();
  for (const item of itemsToPrint) {
    if (item.labTest.isReferred && item.labTest.referredLab) {
      const lab = item.labTest.referredLab;
      referredLabsMap.set(lab.id, {
        id: lab.id,
        name: lab.name,
        logoUrl: lab.logoUrl ?? null,
        stampImageUrl: lab.stampImageUrl ?? null,
      });
    }
  }
  const referredLabs = Array.from(referredLabsMap.values());
  const requestedReferredLabId = referredLabId?.trim() || "";
  const selectedReferredLab =
    (requestedReferredLabId
      ? referredLabs.find((lab) => lab.id === requestedReferredLabId)
      : referredLabs[0]) ?? null;

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

  // Máximo 5 análisis por hoja; los análisis se mantienen agrupados por sección
  const MAX_ITEMS_PER_PAGE = 5;
  type PageChunk = { section: string; items: typeof itemsToPrint };
  const pageChunks: PageChunk[] = [];
  for (const [section, sectionItems] of Object.entries(itemsBySection)) {
    for (let i = 0; i < sectionItems.length; i += MAX_ITEMS_PER_PAGE) {
      pageChunks.push({
        section,
        items: sectionItems.slice(i, i + MAX_ITEMS_PER_PAGE),
      });
    }
  }
  const age = calculateAge(order.patient.birthDate);
  const sexLabel = order.patient.sex === "M" ? "Masculino" : order.patient.sex === "F" ? "Femenino" : "Otro";
  const printConfig = await getPrintConfig();
  const showStamp = printConfig.stampEnabled && printConfig.stampImageUrl;

  const hasPages = pageChunks.length > 0;

  const patientName = formatPatientDisplayName(order.patient.firstName, order.patient.lastName);
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
      {referredLabs.length > 1 && (
        <div className="mx-auto mb-3 flex w-[210mm] justify-end px-4 text-xs text-slate-600 print:hidden">
          <form method="GET" className="flex items-center gap-2">
            {itemsParam && <input type="hidden" name="items" value={itemsParam} />}
            <label htmlFor="referredLabId" className="text-xs">
              Lab. referido:
            </label>
            <select
              id="referredLabId"
              name="referredLabId"
              defaultValue={selectedReferredLab?.id ?? ""}
              className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {referredLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-7 items-center rounded-md bg-slate-900 px-2 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Aplicar
            </button>
          </form>
        </div>
      )}
      <PrintFitToPage />
      {hasPages ? pageChunks.map((chunk, pageIndex) => (
        <div
          key={pageIndex}
          className={`print-a4 relative mx-auto bg-white text-slate-900 print:mx-0 print:shadow-none overflow-hidden ${pageIndex < pageChunks.length - 1 ? "print-page" : ""} ${pageIndex > 0 ? "mt-8 print:mt-0" : ""}`}
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
              {/* Encabezado: logo del laboratorio referido (si aplica) centrado */}
              <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-300 min-h-[3.5rem]">
                <div className="min-w-0 flex-1" aria-hidden />
                {selectedReferredLab ? (
                  <ReferredHeaderBlock referredLab={selectedReferredLab} />
                ) : (
                  <div className="min-w-0 flex-1" aria-hidden />
                )}
                <div className="min-w-0 flex-1" aria-hidden />
              </header>

              <PatientDataBlock
                order={order}
                age={age}
                sexLabel={sexLabel}
              />

              {/* Barra de sección: análisis agrupados por sección */}
              <div
                className="text-white py-2.5 px-4 mb-3 print-section-bar"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.7)" }}
              >
                <h2 className="text-center text-base font-bold uppercase tracking-wide">
                  SECCIÓN {chunk.section}
                </h2>
              </div>

              <p className="text-xs text-slate-600 mb-2 font-medium">ANÁLISIS:</p>

              {chunk.items.map((item) => {
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
                            {(() => {
                              const parsedSnap = typeof item.templateSnapshot === "string"
                                ? (() => { try { return JSON.parse(item.templateSnapshot) as { items?: Array<{ id: string; groupName?: string | null; refRanges?: RefRangeItem[] }> }; } catch { return null; } })()
                                : item.templateSnapshot as { items?: Array<{ id: string; groupName?: string | null; refRanges?: RefRangeItem[] }> } | null;
                              const getGroupName = (res: { templateItemId: string | null }) => {
                                if (!res.templateItemId) return "General";
                                const ti = item.labTest.template?.items.find((t) => t.id === res.templateItemId);
                                if (ti && "groupName" in ti && ti.groupName) return ti.groupName;
                                const snap = parsedSnap;
                                const snapItem = snap?.items?.find((t) => t.id === res.templateItemId);
                                return snapItem?.groupName ?? "General";
                              };
                              const seen = new Set<string>();
                              const items = item.result!.items.filter((res) => {
                                const key = `${(res.paramNameSnapshot ?? "").trim()}|${(res.unitSnapshot ?? "").trim()}`;
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                              });
                              const byGroup = items.reduce(
                                (acc, res) => {
                                  const g = getGroupName(res);
                                  if (!acc[g]) acc[g] = [];
                                  acc[g].push(res);
                                  return acc;
                                },
                                {} as Record<string, typeof items>,
                              );
                              const groupOrder = Array.from(new Set(items.map((r) => getGroupName(r))));
                              return groupOrder.map((groupName) => {
                                const groupItems = byGroup[groupName] ?? [];
                                const showGroupHeader = groupName !== "General" && groupItems.length > 1;
                                return (
                                <Fragment key={groupName}>
                                  {showGroupHeader && (
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                      <td colSpan={4} className="py-1.5 px-3 font-semibold text-slate-800 text-xs uppercase">
                                        {groupName}
                                      </td>
                                    </tr>
                                  )}
                                  {groupItems.map((res) => {
                              // Buscar el templateItem original para obtener refRanges y valueType
                              const templateItem = res.templateItemId 
                                ? item.labTest.template?.items.find((t) => t.id === res.templateItemId)
                                : null;
                              let refRanges: RefRangeItem[] = (templateItem && "refRanges" in templateItem ? (templateItem.refRanges as RefRangeItem[]) : []) ?? [];
                              // Fallback: si no hay refRanges en la plantilla actual, usar templateSnapshot (p. ej. órdenes antiguas o plantilla modificada)
                              if (refRanges.length === 0 && parsedSnap && typeof parsedSnap === "object" && "items" in parsedSnap) {
                                const snapshot = parsedSnap as { items: Array<{ id: string; refRanges?: RefRangeItem[] }> };
                                const snapshotItem = snapshot.items.find((t) => t.id === res.templateItemId);
                                refRanges = (snapshotItem?.refRanges ?? []) as RefRangeItem[];
                              }
                              const valueType = (templateItem as { valueType?: string } | null)?.valueType;
                              const optionsArr = parseSelectOptions((templateItem as { selectOptions?: string | string[] } | null)?.selectOptions);
                              const isNumeric = ["NUMBER", "DECIMAL", "PERCENTAGE"].includes(valueType ?? "");
                              const rawVal = (res.value ?? "").trim();
                              let displayValue: string;
                              if (!rawVal) {
                                displayValue = "-";
                              } else if (isNumeric) {
                                const hasRangeDash = rawVal.includes("-") && rawVal.indexOf("-") > 0;
                                const hasSpaces = /\d\s+\d/.test(rawVal);
                                if (hasRangeDash || hasSpaces) {
                                  displayValue = rawVal;
                                } else {
                                  const formatted = formatWithThousands(rawVal);
                                  displayValue = formatted ? formatted + (valueType === "PERCENTAGE" ? " %" : "") : rawVal;
                                }
                              } else {
                                displayValue = rawVal;
                              }
                              
                              return (
                                <tr key={res.id} className="border-b border-slate-200 last:border-b-0">
                                  <td className="py-2 px-3 font-medium text-slate-900 align-top">
                                    {res.paramNameSnapshot}
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-slate-900 align-top ${
                                      (res as { isHighlighted?: boolean }).isHighlighted ? "font-bold" : ""
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
                                      {!res.refTextSnapshot && refRanges.length === 0 && (
                                        optionsArr.length > 0 ? (
                                          <span className="text-slate-600">{optionsArr.join(" / ")}</span>
                                        ) : (
                                          <span className="font-medium">-</span>
                                        )
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                                </Fragment>
                              );
                              });
                            })()}
                          </tbody>
                        </table>
                        {(item.result?.reportedBy || item.result?.comment) && (
                          <div className="mt-2 space-y-1 text-xs text-slate-600">

                            {item.result?.comment && (
                              <p className="italic">{item.result.comment}</p>
                            )}
                          </div>
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
                items={chunk.items}
                order={order}
                showStamp={!!(showStamp && printConfig.stampImageUrl)}
                stampImageUrl={printConfig.stampImageUrl}
                referredLabStampUrl={selectedReferredLab?.stampImageUrl ?? null}
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
