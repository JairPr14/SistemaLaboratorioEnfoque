import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 100,
    paddingHorizontal: 50,
    paddingBottom: 60,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
  },
  headerLogo: {
    width: 100,
    height: 32,
    objectFit: "contain",
  },
  patientSection: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    gap: 6,
  },
  patientRowFull: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  patientRow: {
    flexDirection: "row",
    width: "48%",
    marginBottom: 2,
    gap: 4,
    minWidth: 0,
  },
  patientLabel: {
    color: "#64748b",
    fontWeight: 600,
    flexShrink: 0,
    fontSize: 8,
  },
  patientValue: {
    color: "#0f172a",
    fontWeight: 600,
    flex: 1,
    minWidth: 0,
    fontSize: 8,
  },
  sectionBar: {
    backgroundColor: "#0f172a",
    color: "white",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  analysisLabel: {
    color: "#475569",
    fontWeight: 600,
    marginBottom: 8,
  },
  table: {
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignItems: "center",
  },
  tableRowGroup: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colAnalisis: {
    width: "42%",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "42%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    minWidth: 0,
    overflow: "hidden",
  },
  colResultados: {
    width: "16%",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "16%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    textAlign: "center",
    minWidth: 0,
    overflow: "hidden",
  },
  colUnidad: {
    width: "12%",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "12%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    textAlign: "center",
    minWidth: 0,
    overflow: "hidden",
  },
  colValorRef: {
    width: "30%",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "30%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    minWidth: 0,
    overflow: "hidden",
  },
  th: {
    fontWeight: 700,
    color: "#0f172a",
  },
  td: {
    color: "#334155",
  },
  tdHighlight: {
    fontWeight: 700,
    color: "#0f172a",
  },
  valorRefText: {
    color: "#475569",
    fontSize: 8,
  },
  noResults: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 16,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 16,
  },
  preAnalytic: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#cbd5e1",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 32,
  },
  footerBlock: {
    alignItems: "center",
  },
  footerLine: {
    width: 120,
    height: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#94a3b8",
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#334155",
  },
  footerSub: {
    fontSize: 8,
    color: "#64748b",
  },
  watermark: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
    zIndex: 0,
  },
});

type RefRangeItem = {
  ageGroup?: string | null;
  sex?: string | null;
  refRangeText?: string | null;
  refMin?: number | null;
  refMax?: number | null;
};

type ResultItem = {
  id: string;
  templateItemId: string | null;
  paramNameSnapshot: string | null;
  value: string | null;
  unitSnapshot: string | null;
  refTextSnapshot: string | null;
  isHighlighted?: boolean;
};

type TemplateItem = {
  id: string;
  groupName?: string | null;
  order?: number;
  refRanges?: RefRangeItem[];
  valueType?: string;
  selectOptions?: string | string[] | null;
};

type LabTestItem = {
  id: string;
  labTest: {
    name: string;
    template: { items: TemplateItem[] } | null;
  };
  templateSnapshot: unknown;
  result: {
    items: ResultItem[];
    comment?: string | null;
  } | null;
};

type ChunkItem = {
  item: LabTestItem;
  paramRange?: { start: number; end: number };
  isContinuation?: boolean;
};

type PageChunk = {
  section: string;
  items: ChunkItem[];
};

export type OrderReportPDFProps = {
  order: {
    patient: { firstName: string; lastName: string; dni: string | null; birthDate: Date; sex: string | null };
    requestedBy: string | null;
    orderCode: string;
    createdAt: Date;
    preAnalyticNote?: string | null;
  };
  chunks: PageChunk[];
  baseUrl: string;
  stampImageUrl: string | null;
  referredLab: { name: string; logoUrl: string | null; stampImageUrl: string | null } | null;
  age: number;
  sexLabel: string;
  formatDate: (d: Date) => string;
  formatPatientName: (first: string, last: string) => string;
  formatWithThousands: (raw: string) => string;
  parseSelectOptions: (v: unknown) => string[];
};

function formatDisplayValue(
  res: ResultItem,
  valueType: string | undefined,
  formatWithThousands: (r: string) => string,
  optionsArr: string[]
): string {
  const rawVal = (res.value ?? "").trim();
  if (!rawVal) return "-";
  const isNumeric = ["NUMBER", "DECIMAL", "PERCENTAGE"].includes(valueType ?? "");
  if (!isNumeric) return rawVal;
  const hasRangeDash = rawVal.includes("-") && rawVal.indexOf("-") > 0;
  const hasSpaces = /\d\s+\d/.test(rawVal);
  if (hasRangeDash || hasSpaces) return rawVal;
  const formatted = formatWithThousands(rawVal);
  return formatted ? formatted + (valueType === "PERCENTAGE" ? " %" : "") : rawVal;
}

function formatValorRef(res: ResultItem, refRanges: RefRangeItem[], optionsArr: string[]): string {
  if (res.refTextSnapshot) return res.refTextSnapshot;
  if (refRanges.length > 0) {
    const ageLabels: Record<string, string> = { NIÑOS: "Niños", JOVENES: "Jóvenes", ADULTOS: "Adultos" };
    const sexLabels: Record<string, string> = { M: "Hombres", F: "Mujeres", O: "Otros" };
    return refRanges
      .map((r) => {
        const criteria = [
          r.ageGroup ? ageLabels[r.ageGroup] || r.ageGroup : null,
          r.sex ? sexLabels[r.sex] || r.sex : null,
        ].filter(Boolean);
        const rangeDisplay =
          r.refRangeText || (r.refMin != null && r.refMax != null ? `${r.refMin} - ${r.refMax}` : "");
        return criteria.length > 0 ? `${criteria.join(" + ")}: ${rangeDisplay}` : rangeDisplay;
      })
      .filter(Boolean)
      .join(" | ") || "-";
  }
  return optionsArr.length > 0 ? optionsArr.join(" / ") : "-";
}

export function OrderReportPDF(props: OrderReportPDFProps) {
  const {
    order,
    chunks,
    baseUrl,
    stampImageUrl,
    referredLab,
    age,
    sexLabel,
    formatDate,
    formatPatientName,
    formatWithThousands,
    parseSelectOptions,
  } = props;

  const patientName = formatPatientName(order.patient.firstName, order.patient.lastName);
  const watermarkUrl = baseUrl.startsWith("http") ? `${baseUrl.replace(/\/$/, "")}/watermark-clinica.png` : "";
  const pages = chunks.length > 0 ? chunks : [{ section: "-", items: [] }];

  return (
    <Document>
      {pages.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {watermarkUrl && (
            <View style={styles.watermark} fixed>
              <Image
                src={watermarkUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </View>
          )}
          <View style={{ position: "relative" }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }} />
              {referredLab?.logoUrl && (
                <Image
                  src={referredLab.logoUrl.startsWith("/") ? `${baseUrl}${referredLab.logoUrl}` : referredLab.logoUrl}
                  style={styles.headerLogo}
                />
              )}
              <View style={{ flex: 1 }} />
            </View>

            <View style={styles.patientSection}>
              <View style={styles.patientRowFull}>
                <Text style={[styles.patientLabel, { marginRight: 6 }]}>PACIENTE:</Text>
                <Text style={styles.patientValue}>{patientName}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>EDAD:</Text>
                <Text style={styles.patientValue}>{age} Años</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>SEXO:</Text>
                <Text style={styles.patientValue}>{sexLabel}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>DNI:</Text>
                <Text style={styles.patientValue}>{order.patient.dni ?? "—"}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>FECHA:</Text>
                <Text style={styles.patientValue}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>N° REGISTRO:</Text>
                <Text style={styles.patientValue}>{order.orderCode}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>INDICACIÓN:</Text>
                <Text style={styles.patientValue}>{order.requestedBy || "Médico tratante"}</Text>
              </View>
            </View>

            <View style={styles.sectionBar}>
              <Text style={styles.sectionTitle}>SECCIÓN {chunk.section}</Text>
            </View>

            <Text style={styles.analysisLabel}>ANÁLISIS:</Text>

            {chunk.items.length === 0 ? (
              <View style={{ paddingVertical: 48, textAlign: "center" }}>
                <Text style={{ color: "#64748b", textAlign: "center" }}>No hay análisis seleccionados para imprimir.</Text>
              </View>
            ) : null}

            {chunk.items.map((chunkItem) => {
              const item = chunkItem.item;
              const paramRange = chunkItem.paramRange;
              const hasResults = item.result && (item.result.items?.length ?? 0) > 0;
              const parsedSnap =
                typeof item.templateSnapshot === "string"
                  ? (() => {
                      try {
                        return JSON.parse(item.templateSnapshot) as { items?: Array<{ id: string; groupName?: string | null; order?: number; refRanges?: RefRangeItem[] }> };
                      } catch {
                        return null;
                      }
                    })()
                  : (item.templateSnapshot as { items?: Array<{ id: string; groupName?: string | null; order?: number; refRanges?: RefRangeItem[] }> } | null);
              const snapItems = parsedSnap?.items ?? [];
              const templateItems = item.labTest.template?.items ?? [];

              const getGroupName = (res: { templateItemId: string | null }) => {
                const snapItem = snapItems.find((t) => t.id === res.templateItemId);
                const g = snapItem?.groupName?.trim();
                if (g) return g;
                const ti = templateItems.find((t) => t.id === res.templateItemId);
                const tg = ti && "groupName" in ti ? String((ti as { groupName?: string }).groupName ?? "").trim() : "";
                return tg || "General";
              };
              const getItemOrder = (templateItemId: string | null) => {
                const snapItem = snapItems.find((t) => t.id === templateItemId);
                if (snapItem != null && typeof snapItem.order === "number") return snapItem.order;
                const ti = templateItems.find((t) => t.id === templateItemId);
                return ti && "order" in ti && typeof (ti as { order?: number }).order === "number"
                  ? (ti as { order: number }).order
                  : 9999;
              };

              const seen = new Set<string>();
              const allItems = (item.result?.items ?? []).filter((res) => {
                const key = `${(res.paramNameSnapshot ?? "").trim()}|${(res.unitSnapshot ?? "").trim()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              const byGroup = allItems.reduce(
                (acc, res) => {
                  const g = getGroupName(res);
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(res);
                  return acc;
                },
                {} as Record<string, ResultItem[]>
              );
              const groupOrder = Object.keys(byGroup).sort(
                (a, b) =>
                  Math.min(...(byGroup[a] ?? []).map((r) => getItemOrder(r.templateItemId))) -
                  Math.min(...(byGroup[b] ?? []).map((r) => getItemOrder(r.templateItemId)))
              );

              const flatItems: ResultItem[] = [];
              for (const g of groupOrder) {
                const raw = byGroup[g] ?? [];
                const sorted = raw.sort(
                  (a, b) => getItemOrder(a.templateItemId) - getItemOrder(b.templateItemId)
                );
                flatItems.push(...sorted);
              }

              const items = paramRange
                ? flatItems.slice(paramRange.start, paramRange.end)
                : flatItems;

              if (hasResults && items.length === 0) return null;

              return (
                <View key={`${item.id}-${paramRange?.start ?? 0}`} style={{ marginBottom: 20 }}>
                  <Text style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                    {item.labTest.name}
                    {chunkItem.isContinuation ? " (continuación)" : ""}
                  </Text>
                  {hasResults ? (
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <View style={styles.colAnalisis}>
                          <Text style={styles.th}>ANÁLISIS</Text>
                        </View>
                        <View style={styles.colResultados}>
                          <Text style={[styles.th, { textAlign: "center" }]}>RESULTADOS</Text>
                        </View>
                        <View style={styles.colUnidad}>
                          <Text style={[styles.th, { textAlign: "center" }]}>UNIDAD</Text>
                        </View>
                        <View style={styles.colValorRef}>
                          <Text style={styles.th}>VALOR REFERENCIAL</Text>
                        </View>
                      </View>
                      {groupOrder.map((groupName) => {
                        const rawItems = (byGroup[groupName] ?? []).filter((r) => items.includes(r));
                        if (rawItems.length === 0) return null;
                        const groupItems = rawItems.sort(
                          (a, b) => getItemOrder(a.templateItemId) - getItemOrder(b.templateItemId)
                        );
                        const showGroupHeader = groupName !== "General" && groupItems.length > 1;
                        return (
                          <View key={groupName}>
                            {showGroupHeader && (
                              <View style={[styles.tableRowGroup, { width: "100%" }]}>
                                <Text style={{ fontWeight: 600, color: "#0f172a", fontSize: 8 }}>{groupName}</Text>
                              </View>
                            )}
                            {groupItems.map((res) => {
                              const templateItem = res.templateItemId
                                ? templateItems.find((t) => t.id === res.templateItemId)
                                : null;
                              let refRanges: RefRangeItem[] =
                                (templateItem && "refRanges" in templateItem ? (templateItem.refRanges as RefRangeItem[]) : []) ?? [];
                              if (refRanges.length === 0 && parsedSnap && "items" in parsedSnap) {
                                const snap = parsedSnap as { items: Array<{ id: string; refRanges?: RefRangeItem[] }> };
                                const snapItem = snap.items.find((t) => t.id === res.templateItemId);
                                refRanges = snapItem?.refRanges ?? [];
                              }
                              const valueType = (templateItem as { valueType?: string } | null)?.valueType;
                              const optionsArr = parseSelectOptions((templateItem as { selectOptions?: unknown } | null)?.selectOptions);
                              const displayValue = formatDisplayValue(res, valueType, formatWithThousands, optionsArr);
                              const valorRef = formatValorRef(res, refRanges, optionsArr);

                              return (
                                <View key={res.id} style={styles.tableRow}>
                                  <View style={styles.colAnalisis}>
                                    <Text style={styles.td} wrap>{res.paramNameSnapshot ?? "-"}</Text>
                                  </View>
                                  <View style={styles.colResultados}>
                                    <Text style={[res.isHighlighted ? styles.tdHighlight : styles.td, { textAlign: "center" }]} wrap>{displayValue}</Text>
                                  </View>
                                  <View style={styles.colUnidad}>
                                    <Text style={[styles.td, { textAlign: "center" }]} wrap>{res.unitSnapshot || "-"}</Text>
                                  </View>
                                  <View style={styles.colValorRef}>
                                    <Text style={styles.valorRefText} wrap>{valorRef}</Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.noResults}>
                      <Text>Sin resultados registrados.</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {pageIndex === 0 && order.preAnalyticNote && (
              <View style={styles.preAnalytic}>
                <Text style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Observaciones preanalíticas</Text>
                <Text>{order.preAnalyticNote}</Text>
              </View>
            )}
          </View>
        </Page>
      ))}
    </Document>
  );
}
