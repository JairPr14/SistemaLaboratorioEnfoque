import { z } from "zod";

export const sexValues = ["M", "F", "O"] as const;
export const ageGroupValues = ["NIÑOS", "JOVENES", "ADULTOS"] as const;
export const sectionValues = [
  "BIOQUIMICA",
  "HEMATOLOGIA",
  "INMUNOLOGIA",
  "ORINA",
  "HECES",
  "OTROS",
] as const;
export const valueTypeValues = ["NUMBER", "TEXT", "SELECT"] as const;
export const orderStatusValues = [
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADO",
  "ENTREGADO",
  "ANULADO",
] as const;
export const orderItemStatusValues = [
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADO",
] as const;
export const orderPatientTypeValues = ["CLINICA", "EXTERNO", "IZAGA"] as const;

export const patientSchema = z.object({
  code: z.string().min(3).optional(),
  dni: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  birthDate: z.string().min(1),
  sex: z.enum(sexValues),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const labTestSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  section: z.enum(sectionValues),
  price: z.coerce.number().min(0),
  estimatedTimeMinutes: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export const templateItemRefRangeSchema = z.object({
  id: z.string().optional(),
  ageGroup: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.enum(ageGroupValues).optional().nullable()
  ),
  sex: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.enum(sexValues).optional().nullable()
  ),
  refRangeText: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : String(val)),
    z.string().optional().nullable()
  ),
  refMin: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().optional().nullable()
  ),
  refMax: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().optional().nullable()
  ),
  order: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z.coerce.number().int().min(0).default(0)
  ),
});

export const templateItemSchema = z.object({
  groupName: z.string().optional().nullable(),
  paramName: z.string().min(2),
  unit: z.string().optional().nullable(),
  refRangeText: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : String(val)),
    z.string().optional().nullable()
  ), // Mantener para compatibilidad
  refMin: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().optional().nullable()
  ), // Mantener para compatibilidad
  refMax: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().optional().nullable()
  ), // Mantener para compatibilidad
  valueType: z.enum(valueTypeValues),
  selectOptions: z.array(z.string()).default([]),
  order: z.coerce.number().int().min(0),
  refRanges: z.array(templateItemRefRangeSchema).optional().default([]),
});

export const templateSchema = z.object({
  labTestId: z.string().min(1),
  title: z.string().min(2),
  notes: z.string().optional().nullable(),
  items: z.array(templateItemSchema).min(1),
});

export const orderCreateSchema = z.object({
  patientId: z.string().min(1),
  requestedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  orderDate: z.string().optional(),
  patientType: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(orderPatientTypeValues).nullable()
  ).optional(),
  labTestIds: z.array(z.string().min(1)).optional().default([]),
  profileIds: z.array(z.string().min(1)).optional().default([]),
}).refine(
  (data) => data.labTestIds.length > 0 || data.profileIds.length > 0,
  { message: "Selecciona al menos un análisis o una promoción", path: ["labTestIds"] }
);

export const orderAddItemsSchema = z.object({
  labTestIds: z.array(z.string().min(1)).min(1),
});

export const patientDraftSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dni: z.string().min(6),
  sex: z.enum(sexValues),
  birthDate: z.string().min(1),
});

export const quickOrderSchema = z.object({
  patientId: z.string().optional(),
  patientDraft: patientDraftSchema.optional(),
  doctorName: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  patientType: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(orderPatientTypeValues).nullable()
  ).optional(),
  tests: z.array(z.string().min(1)).optional().default([]),
  profileIds: z.array(z.string().min(1)).optional().default([]),
}).refine(
  (data) => data.tests.length > 0 || data.profileIds.length > 0,
  { message: "Selecciona al menos un análisis o una promoción", path: ["tests"] }
);

export const testProfileSchema = z.object({
  name: z.string().min(2, "Nombre mínimo 2 caracteres"),
  packagePrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).nullable()
  ),
  labTestIds: z.array(z.string().min(1)).min(1, "Incluye al menos un análisis"),
});

export const orderUpdateSchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  deliveredAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
  patientType: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(orderPatientTypeValues).nullable()
  ).optional(),
});

export const resultItemSchema = z.object({
  templateItemId: z.string().optional().nullable(),
  paramNameSnapshot: z.string().min(1),
  unitSnapshot: z.string().optional().nullable(),
  refTextSnapshot: z.string().optional().nullable(),
  refMinSnapshot: z.coerce.number().optional().nullable(),
  refMaxSnapshot: z.coerce.number().optional().nullable(),
  value: z.string().min(1),
  isOutOfRange: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0),
});

export const resultSchema = z.object({
  reportedBy: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  items: z.array(resultItemSchema).min(1),
});

export const resultDraftItemSchema = z.object({
  templateItemId: z.string().optional().nullable(),
  paramNameSnapshot: z.string(),
  unitSnapshot: z.string().optional().nullable(),
  refTextSnapshot: z.string().optional().nullable(),
  refMinSnapshot: z.coerce.number().optional().nullable(),
  refMaxSnapshot: z.coerce.number().optional().nullable(),
  value: z.string(),
  isOutOfRange: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0),
});

export const resultDraftSchema = z.object({
  items: z.array(resultDraftItemSchema).min(1),
  updatedAtClient: z.string().optional(),
});
