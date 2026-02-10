import { z } from "zod";

export const sexValues = ["M", "F", "O"] as const;
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

export const patientSchema = z.object({
  code: z.string().min(3),
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

export const templateItemSchema = z.object({
  groupName: z.string().optional().nullable(),
  paramName: z.string().min(2),
  unit: z.string().optional().nullable(),
  refRangeText: z.string().optional().nullable(),
  refMin: z.coerce.number().optional().nullable(),
  refMax: z.coerce.number().optional().nullable(),
  valueType: z.enum(valueTypeValues),
  selectOptions: z.array(z.string()).default([]),
  order: z.coerce.number().int().min(0),
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
  tests: z.array(z.string().min(1)).min(1),
});

export const orderUpdateSchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  deliveredAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
