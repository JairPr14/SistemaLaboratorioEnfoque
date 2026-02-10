export type PatientMock = {
  id: string;
  fullName: string;
  dni: string;
  sex: string;
  age: number;
};

export type OrderMock = {
  id: string;
  code: string;
  patient: PatientMock;
  createdAt: string;
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "ENTREGADO" | "ANULADO";
  tests: string[];
  doctor?: string;
  section?: string;
};

export type DashboardStats = {
  patientsCount: number;
  ordersCount: number;
  pendingCount: number;
  catalogCount: number;
  ordersToday: number;
  avgTATHours: number;
  patientsDelta?: number;
  ordersDelta?: number;
};

export type RecentActivityMock = {
  id: string;
  type: "order_created" | "result_captured" | "pdf_generated" | "order_delivered";
  text: string;
  orderCode?: string;
  createdAt: string;
};

const baseDate = new Date();

export const mockPatients: PatientMock[] = [
  { id: "p1", fullName: "Juan Pérez García", dni: "12345678", sex: "M", age: 35 },
  { id: "p2", fullName: "María López Soto", dni: "87654321", sex: "F", age: 28 },
  { id: "p3", fullName: "Carlos Rodríguez", dni: "11223344", sex: "M", age: 45 },
];

export const mockOrders: OrderMock[] = [
  {
    id: "o1",
    code: "ORD-20260210-0001",
    patient: mockPatients[0],
    createdAt: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    status: "PENDIENTE",
    tests: ["HEMOGRAMA", "GLUCOSA"],
    doctor: "Dr. Lobato",
    section: "HEMATOLOGIA",
  },
  {
    id: "o2",
    code: "ORD-20260210-0002",
    patient: mockPatients[1],
    createdAt: new Date(baseDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    status: "EN_PROCESO",
    tests: ["UREA", "CREATININA"],
    doctor: "Dr. García",
    section: "BIOQUIMICA",
  },
  {
    id: "o3",
    code: "ORD-20260209-0003",
    patient: mockPatients[2],
    createdAt: new Date(baseDate.getTime() - 14 * 60 * 60 * 1000).toISOString(),
    status: "PENDIENTE",
    tests: ["HCG"],
    doctor: "Dra. Sánchez",
    section: "INMUNOLOGIA",
  },
  {
    id: "o4",
    code: "ORD-20260209-0002",
    patient: mockPatients[0],
    createdAt: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    status: "COMPLETADO",
    tests: ["PERFIL LIPÍDICO"],
    doctor: "Dr. Lobato",
    section: "BIOQUIMICA",
  },
];

export const mockRecentActivity: RecentActivityMock[] = [
  { id: "a1", type: "order_created", text: "Se creó ORD-20260210-0002", orderCode: "ORD-20260210-0002", createdAt: new Date().toISOString() },
  { id: "a2", type: "result_captured", text: "Se capturó resultado HCG", orderCode: "ORD-20260209-0003", createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "a3", type: "pdf_generated", text: "Se generó PDF", orderCode: "ORD-20260209-0001", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "a4", type: "order_delivered", text: "Se entregó orden", orderCode: "ORD-20260208-0010", createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: "a5", type: "order_created", text: "Se creó ORD-20260210-0001", orderCode: "ORD-20260210-0001", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "a6", type: "result_captured", text: "Se capturó resultado HEMOGRAMA", orderCode: "ORD-20260209-0005", createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: "a7", type: "pdf_generated", text: "Se generó PDF", orderCode: "ORD-20260209-0004", createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
  { id: "a8", type: "order_delivered", text: "Se entregó orden", orderCode: "ORD-20260208-0009", createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
];

export function getMockDashboardStats(fallback: Partial<DashboardStats>): DashboardStats {
  return {
    patientsCount: 0,
    ordersCount: 0,
    pendingCount: 0,
    catalogCount: 0,
    ordersToday: 0,
    avgTATHours: 24,
    ...fallback,
  };
}
