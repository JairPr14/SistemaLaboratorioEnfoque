import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getPrintConfig } from "@/lib/print-config";
import { formatDatePrint, formatDniDisplay, formatPatientDisplayName, formatSexDisplay } from "@/lib/format";
import { PrintToolbar } from "@/components/orders/PrintToolbar";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ items?: string; showReferredLogo?: string }>;
};

type RefRangeItem = {
  ageGroup?: string | null;
  sex?: string | null;
  refRangeText?: string | null;
  refMin?: number | null;
  refMax?: number | null;
};

type RenderRow =
  | { kind: "group"; id: string; groupName: string }
  | {
      kind: "param";
      id: string;
      paramName: string;
      resultValue: string;
      unit: string;
      refValue: string;
      description?: string | null;
      isHighlighted?: boolean;
    };

type AnalysisChunk = {
  itemId: string;
  analysisCode: string;
  analysisName: string;
  isContinuation: boolean;
  rows: RenderRow[];
  isReferred?: boolean;
};

type PrintPage = {
  section: string;
  analyses: AnalysisChunk[];
  hasReferredAnalyses?: boolean;
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

function parseTemplateSnapshot(snapshot: unknown): {
  items?: Array<{
    id: string;
    groupName?: string | null;
    paramName?: string;
    order?: number;
    refRanges?: RefRangeItem[];
  }>;
} | null {
  if (!snapshot) return null;
  if (typeof snapshot === "string") {
    try {
      return JSON.parse(snapshot) as {
        items?: Array<{
          id: string;
          groupName?: string | null;
          paramName?: string;
          order?: number;
          refRanges?: RefRangeItem[];
        }>;
      };
    } catch {
      return null;
    }
  }
  return snapshot as {
    items?: Array<{
      id: string;
      groupName?: string | null;
      paramName?: string;
      order?: number;
      refRanges?: RefRangeItem[];
    }>;
  };
}

function formatReferenceValue(
  refTextSnapshot: string | null,
  refMinSnapshot: number | null,
  refMaxSnapshot: number | null,
  refRanges: RefRangeItem[]
): string {
  if (refTextSnapshot && refTextSnapshot.trim() !== "") return refTextSnapshot;
  const parts = refRanges
    .map((r) => {
      const rangeStr = (r.refRangeText?.trim()) || (r.refMin != null || r.refMax != null ? `${r.refMin ?? ""} - ${r.refMax ?? ""}`.trim() : "");
      if (!rangeStr) return "";
      const sexLabel = r.sex === "M" ? "Hombres" : r.sex === "F" ? "Mujeres" : null;
      return sexLabel ? `${sexLabel} : ${rangeStr}` : rangeStr;
    })
    .filter(Boolean);
  if (parts.length > 0) return parts.join("\n");
  if (refMinSnapshot != null || refMaxSnapshot != null) return `${refMinSnapshot ?? ""} - ${refMaxSnapshot ?? ""}`.trim();
  return "-";
}

function buildRowsForItem(item: {
  id: string;
  templateSnapshot: unknown;
  labTest: {
    code: string;
    name: string;
    template: {
      items: Array<{
        id: string;
        groupName: string | null;
        order: number;
        description?: string | null;
        refRanges: RefRangeItem[];
      }>;
    } | null;
  };
  result: {
    items: Array<{
      id: string;
      templateItemId: string | null;
      paramNameSnapshot: string | null;
      unitSnapshot: string | null;
      refTextSnapshot: string | null;
      refMinSnapshot: number | null;
      refMaxSnapshot: number | null;
      value: string | null;
      order: number;
      isHighlighted?: boolean;
    }>;
  } | null;
}): RenderRow[] {
  const resultItems = item.result?.items ?? [];
  // No deduplicar: permitir parámetros con mismo nombre en plantilla (ej. Leucocitos en distintos grupos)

  const parsedSnap = parseTemplateSnapshot(item.templateSnapshot);
  const snapItems = parsedSnap?.items ?? [];
  const templateItems = item.labTest.template?.items ?? [];

  const getGroupName = (r: { templateItemId: string | null; paramNameSnapshot: string | null }) => {
    const templateItemId = r.templateItemId;
    const paramName = (r.paramNameSnapshot ?? "").trim();
    // 1) Por templateItemId: snapshot y plantilla
    if (templateItemId) {
      const snapItem = snapItems.find((t) => t.id === templateItemId);
      const sg = snapItem?.groupName?.trim();
      if (sg) return sg;
      const ti = templateItems.find((t) => t.id === templateItemId);
      const tg = ti?.groupName?.trim();
      if (tg) return tg;
    }
    // 2) Fallback: coincidir por nombre (parámetros extra, IDs obsoletos, etc.)
    if (paramName) {
      const snapByParam = snapItems.find(
        (t) => t.paramName?.trim().toLowerCase() === paramName.toLowerCase()
      );
      const sg = snapByParam?.groupName?.trim();
      if (sg) return sg;
      const tiByParam = templateItems.find(
        (t) => (t as { paramName?: string }).paramName?.trim().toLowerCase() === paramName.toLowerCase()
      );
      const tg = tiByParam?.groupName?.trim();
      if (tg) return tg;
    }
    return "General";
  };

  const getOrder = (templateItemId: string | null, fallbackOrder: number) => {
    const snapItem = snapItems.find((t) => t.id === templateItemId);
    if (typeof snapItem?.order === "number") return snapItem.order;
    const ti = templateItems.find((t) => t.id === templateItemId);
    if (typeof ti?.order === "number") return ti.order;
    return fallbackOrder;
  };

  const getRefRanges = (templateItemId: string | null): RefRangeItem[] => {
    const fromSnap = snapItems.find((t) => t.id === templateItemId)?.refRanges ?? [];
    if (fromSnap.length > 0) return fromSnap;
    return templateItems.find((t) => t.id === templateItemId)?.refRanges ?? [];
  };

  const getDescription = (templateItemId: string | null): string | null => {
    const ti = templateItems.find((t) => t.id === templateItemId);
    const d = ti?.description?.trim();
    return d || null;
  };

  const grouped = resultItems.reduce(
    (acc, r) => {
      const group = getGroupName(r);
      if (!acc[group]) acc[group] = [];
      acc[group].push(r);
      return acc;
    },
    {} as Record<string, typeof resultItems>
  );

  const groupOrder = Object.keys(grouped).sort(
    (a, b) =>
      Math.min(...(grouped[a] ?? []).map((r) => getOrder(r.templateItemId, r.order))) -
      Math.min(...(grouped[b] ?? []).map((r) => getOrder(r.templateItemId, r.order)))
  );

  const rows: RenderRow[] = [];
  for (const groupName of groupOrder) {
    const sorted = (grouped[groupName] ?? []).sort(
      (a, b) => getOrder(a.templateItemId, a.order) - getOrder(b.templateItemId, b.order)
    );
    const showGroupHeader = groupName !== "General" && sorted.length > 1;
    if (showGroupHeader) {
      rows.push({
        kind: "group",
        id: `${item.id}-${groupName}-header`,
        groupName,
      });
    }
    for (const r of sorted) {
      rows.push({
        kind: "param",
        id: r.id,
        paramName: r.paramNameSnapshot ?? "-",
        resultValue: (r.value ?? "-").trim() || "-",
        unit: (r.unitSnapshot ?? "-").trim() || "-",
        refValue: formatReferenceValue(
          r.refTextSnapshot,
          r.refMinSnapshot,
          r.refMaxSnapshot,
          getRefRanges(r.templateItemId)
        ),
        description: getDescription(r.templateItemId),
        isHighlighted: r.isHighlighted ?? false,
      });
    }
  }

  return rows;
}

const MIN_ROWS_LAST_CHUNK = 6;

/** Particiona filas en bloques por grupo (cada grupo = header + sus params) */
function getGroupBlocks(rows: RenderRow[]): RenderRow[][] {
  const blocks: RenderRow[][] = [];
  let current: RenderRow[] = [];
  for (const row of rows) {
    if (row.kind === "group") {
      if (current.length > 0) blocks.push(current);
      current = [row];
    } else {
      current.push(row);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/** Divide filas por límite de capacidad, prefiriendo cortes en bordes de grupo */
function splitRowsForContinuation(rows: RenderRow[], maxRowsPerChunk: number): RenderRow[][] {
  if (rows.length === 0) return [];
  if (rows.length <= maxRowsPerChunk) return [rows];

  const blocks = getGroupBlocks(rows);
  const chunks: RenderRow[][] = [];
  let chunk: RenderRow[] = [];
  let used = 0;

  for (const block of blocks) {
    const blockLen = block.length;
    if (used + blockLen <= maxRowsPerChunk) {
      chunk.push(...block);
      used += blockLen;
      continue;
    }
    if (chunk.length > 0) {
      chunks.push(chunk);
      chunk = [];
      used = 0;
    }
    if (blockLen <= maxRowsPerChunk) {
      chunk.push(...block);
      used = blockLen;
    } else {
      for (const row of block) {
        if (used >= maxRowsPerChunk) {
          chunks.push(chunk);
          chunk = [];
          used = 0;
        }
        chunk.push(row);
        used += 1;
      }
    }
  }
  if (chunk.length > 0) chunks.push(chunk);

  const filtered = chunks.filter((c) => c.length > 0);
  if (filtered.length <= 1) return filtered;
  const last = filtered[filtered.length - 1];
  if (last && last.length < MIN_ROWS_LAST_CHUNK && filtered.length >= 2) {
    const prev = filtered[filtered.length - 2];
    if (prev && prev.length + last.length <= maxRowsPerChunk) {
      prev.push(...last);
      filtered.pop();
    }
  }
  return filtered;
}

function isItemReferredWithLogo(item: {
  referredLab?: { logoUrl: string | null } | null;
  labTest?: {
    referredLab?: { logoUrl: string | null } | null;
    referredLabOptions?: Array<{
      isDefault?: boolean;
      referredLab?: { logoUrl: string | null } | null;
    }>;
  };
}): boolean {
  if (item.referredLab?.logoUrl) return true;
  if (item.labTest?.referredLab?.logoUrl) return true;
  const opts = item.labTest?.referredLabOptions ?? [];
  const def = opts.find((o) => o.isDefault) ?? opts[0];
  return !!def?.referredLab?.logoUrl;
}

function buildPages(sections: Record<string, Array<{
  id: string;
  templateSnapshot: unknown;
  labTest: {
    code: string;
    name: string;
    referredLab?: { logoUrl: string | null } | null;
    referredLabOptions?: Array<{
      isDefault?: boolean;
      referredLab?: { logoUrl: string | null } | null;
    }>;
    template: {
      items: Array<{
        id: string;
        groupName: string | null;
        order: number;
        description?: string | null;
        refRanges: RefRangeItem[];
      }>;
    } | null;
  };
  referredLab?: { logoUrl: string | null } | null;
  result: {
    items: Array<{
      id: string;
      templateItemId: string | null;
      paramNameSnapshot: string | null;
      unitSnapshot: string | null;
      refTextSnapshot: string | null;
      refMinSnapshot: number | null;
      refMaxSnapshot: number | null;
      value: string | null;
      order: number;
      isHighlighted?: boolean;
    }>;
  } | null;
}>>): PrintPage[] {
  const pages: PrintPage[] = [];

  const PAGE_ROW_CAPACITY = 28;
  const ANALYSIS_HEADER_COST = 6;
  const MAX_ROWS_PER_CONTINUATION_CHUNK = 25;

  for (const [sectionName, sectionItems] of Object.entries(sections)) {
    let currentPage: PrintPage = { section: sectionName, analyses: [] };
    let remaining = PAGE_ROW_CAPACITY;

    const flushCurrent = () => {
      if (currentPage.analyses.length > 0) {
        currentPage.hasReferredAnalyses = currentPage.analyses.some((a) => a.isReferred);
        pages.push(currentPage);
      }
      currentPage = { section: sectionName, analyses: [] };
      remaining = PAGE_ROW_CAPACITY;
    };

    for (const item of sectionItems) {
      const rows = buildRowsForItem(item);
      const chunks = splitRowsForContinuation(rows, MAX_ROWS_PER_CONTINUATION_CHUNK);

      const itemIsReferred = isItemReferredWithLogo(item);

      if (chunks.length === 1) {
        const cost = ANALYSIS_HEADER_COST + chunks[0].length;
        if (cost > remaining && currentPage.analyses.length > 0) flushCurrent();
        currentPage.analyses.push({
          itemId: item.id,
          analysisCode: item.labTest.code,
          analysisName: item.labTest.name,
          isContinuation: false,
          rows: chunks[0],
          isReferred: itemIsReferred,
        });
        remaining -= Math.min(cost, remaining);
        continue;
      }

      if (currentPage.analyses.length > 0) flushCurrent();
      chunks
        .filter((chunkRows) => chunkRows.length > 0)
        .forEach((chunkRows, idx) => {
          pages.push({
            section: sectionName,
            analyses: [
              {
                itemId: `${item.id}-${idx}`,
                analysisCode: item.labTest.code,
                analysisName: item.labTest.name,
                isContinuation: idx > 0,
                rows: chunkRows,
                isReferred: itemIsReferred,
              },
            ],
            hasReferredAnalyses: itemIsReferred,
          });
        });
      currentPage = { section: sectionName, analyses: [] };
      remaining = PAGE_ROW_CAPACITY;
    }

    if (currentPage.analyses.length > 0) {
      currentPage.hasReferredAnalyses = currentPage.analyses.some((a) => a.isReferred);
      pages.push(currentPage);
    }
  }

  return pages;
}

export default async function OrderPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { items: itemsParam, showReferredLogo: showReferredLogoParam } = await searchParams;
  const showReferredLogo = showReferredLogoParam === "0" ? false : true;

  const order = await prisma.labOrder.findFirst({
    where: { id },
    include: {
      patient: true,
      items: {
        include: {
          labTest: {
            include: {
              section: true,
              referredLab: { select: { id: true, name: true, logoUrl: true } },
              referredLabOptions: {
                include: { referredLab: { select: { id: true, name: true, logoUrl: true } } },
                take: 5,
              },
              template: {
                include: {
                  items: {
                    include: { refRanges: { orderBy: { order: "asc" } } },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
          referredLab: { select: { id: true, name: true, logoUrl: true } },
          result: { include: { items: { orderBy: { order: "asc" } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  if (order.status === "ANULADO") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-center text-slate-600">
          No se puede generar el PDF: la orden está anulada.
        </p>
        <Link
          href={`/orders/${id}`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Volver a la orden
        </Link>
      </div>
    );
  }

  const hasItemsParam = typeof itemsParam === "string";
  const selectedItemIds = hasItemsParam
    ? new Set(itemsParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  let itemsToPrint =
    hasItemsParam && selectedItemIds
      ? order.items.filter((item) => selectedItemIds.has(item.id))
      : order.items;

  itemsToPrint = itemsToPrint.filter(
    (item) => item.result && (item.result.items?.length ?? 0) > 0
  );

  const itemsBySection = itemsToPrint.reduce(
    (acc, item) => {
      const key = item.labTest.section?.name ?? item.labTest.section?.code ?? "OTROS";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, typeof itemsToPrint>
  );

  const sortedSections = Object.entries(itemsBySection).sort(
    ([, a], [, b]) => (a[0]?.labTest.section?.order ?? 999) - (b[0]?.labTest.section?.order ?? 999)
  );
  const orderedSections = Object.fromEntries(sortedSections);

  const pages = buildPages(orderedSections).filter(
    (p) => p.analyses.some((a) => a.rows.length > 0)
  );
  const patientName = formatPatientDisplayName(order.patient.firstName, order.patient.lastName);
  const age = calculateAge(order.patient.birthDate);
  const analysesNames = [...new Set(itemsToPrint.map((i) => i.labTest.name))].join(", ");
  const date = formatDatePrint(order.createdAt);

  const getEffectiveReferredLab = (
    item: (typeof itemsToPrint)[number]
  ): { id: string; name: string; logoUrl: string | null } | null => {
    if (item.referredLab) return item.referredLab;
    if (item.labTest.referredLab) return item.labTest.referredLab;
    const opts = item.labTest.referredLabOptions ?? [];
    const defaultOpt =
      opts.find((o) => (o as { isDefault?: boolean }).isDefault) ?? opts[0];
    return defaultOpt?.referredLab ?? null;
  };

  const referredLabWithLogo = itemsToPrint
    .map(getEffectiveReferredLab)
    .find((lab) => lab?.logoUrl);

  const printConfig = await getPrintConfig();
  const showStamp = printConfig.stampEnabled && printConfig.stampImageUrl;

  const buildPrintUrl = (logoVisible: boolean) => {
    const params = new URLSearchParams();
    if (typeof itemsParam === "string") params.set("items", itemsParam);
    if (!logoVisible) params.set("showReferredLogo", "0");
    const qs = params.toString();
    return qs ? `/orders/${id}/print?${qs}` : `/orders/${id}/print`;
  };

  return (
    <div className="print-module-root bg-slate-100 p-4">
      <PrintToolbar
        patientName={patientName}
        patientPhone={order.patient.phone}
        analysesNames={analysesNames}
        date={date}
        backHref={`/orders/${id}`}
        toggleLogoUrl={buildPrintUrl(!showReferredLogo)}
        showLogoButton={!!referredLabWithLogo}
        logoVisible={showReferredLogo}
      />

      {pages.length === 0 ? (
        <div className="mx-auto w-[210mm] bg-white p-10 text-center text-slate-600">
          <p className="font-medium">No hay análisis para imprimir.</p>
          <p className="mt-2 text-sm">
            Los análisis solicitados deben tener resultados capturados para generar el PDF.
          </p>
        </div>
      ) : (
        pages.map((page, pageIndex) => (
          <div key={`${page.section}-${pageIndex}`} className="print-html-page relative mx-auto mb-4 bg-white shadow">
            <img
              src="/watermark-clinica.png"
              alt="Watermark"
              className="print-watermark pointer-events-none select-none"
            />
            {showReferredLogo && referredLabWithLogo && page.hasReferredAnalyses && (
              <div className="print-referred-lab-header">
                <span className="print-referred-lab-label">Con el respaldo de</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referredLabWithLogo.logoUrl!}
                  alt={referredLabWithLogo.name}
                  className="print-referred-lab-logo"
                />
              </div>
            )}
            <div className="print-html-content relative z-10">
              <div className="print-patient-grid">
                <div><span className="label">PACIENTE :</span> {patientName}</div>
                <div><span className="label">SEXO :</span> {formatSexDisplay(order.patient.sex)}</div>
                <div><span className="label">EDAD :</span> {age} Años</div>
                <div><span className="label">DNI :</span> {formatDniDisplay(order.patient.dni)}</div>
                <div><span className="label">FECHA :</span> {formatDatePrint(order.createdAt)}</div>
                <div><span className="label">INDICACIÓN :</span> {order.requestedBy || "MEDICO TRATANTE"}</div>
                <div><span className="label">N°REGISTRO :</span> {order.orderCode}</div>
              </div>

              <div className="print-analisis-label">ANALISIS :</div>
              <div className="print-section-title"> {page.section.toUpperCase()}</div>

              {page.analyses.map((analysis) => (
                <div key={analysis.itemId} className="print-analysis-block">
                  <div className="print-analysis-name">
                    {analysis.analysisName}
                    {analysis.isContinuation ? " (continuación)" : ""}
                  </div>

                  <table className="print-report-table mt-2">
                    <colgroup>
                      <col className="col-analisis" />
                      <col className="col-resultados" />
                      <col className="col-unidad" />
                      <col className="col-valor-ref" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>ANÁLISIS</th>
                        <th>RESULTADO</th>
                        <th>UNIDAD</th>
                        <th>VALOR REFERENCIAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.rows.length === 0 ? (
                        <tr>
                          <td colSpan={4}>Sin resultados registrados.</td>
                        </tr>
                      ) : (
                        analysis.rows.map((row) =>
                          row.kind === "group" ? (
                            <tr key={row.id} className="print-group-row">
                              <td colSpan={4}>{row.groupName}</td>
                            </tr>
                          ) : (
                            <tr key={row.id}>
                              <td>{row.paramName}</td>
                              <td className={`text-center ${row.isHighlighted ? "font-bold" : ""}`}>{row.resultValue}</td>
                              <td className="text-center">{row.unit}</td>
                              <td className="print-valor-ref">
                                {row.refValue}
                                {row.description && (
                                  <div className="print-param-description">{row.description}</div>
                                )}
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            {showStamp && pageIndex === pages.length - 1 && (
              <div className="print-stamp-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={printConfig.stampImageUrl!}
                  alt="Sello y firma"
                  className="print-stamp-img"
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
