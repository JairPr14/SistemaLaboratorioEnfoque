import { prisma } from "@/lib/prisma";

/** Genera el siguiente código correlativo de paciente: PAC-0001, PAC-0002, ... */
export async function generateNextPatientCode() {
  const last = await prisma.patient.findFirst({
    where: { code: { startsWith: "PAC-" } },
    select: { code: true },
    orderBy: { code: "desc" },
  });
  const maxNumber = last ? parseInt(last.code.slice(4), 10) || 0 : 0;
  const nextNumber = maxNumber + 1;
  const padded = String(nextNumber).padStart(4, "0");
  return `PAC-${padded}`;
}

