import { prisma } from "@/lib/prisma";

/** Genera el siguiente código correlativo de paciente: PAC-0001, PAC-0002, ... */
export async function generateNextPatientCode() {
  const patients = await prisma.patient.findMany({
    where: { code: { startsWith: "PAC-" } },
    select: { code: true },
  });

  let maxNumber = 0;
  for (const p of patients) {
    const numeric = parseInt(p.code.slice(4), 10);
    if (!Number.isNaN(numeric) && numeric > maxNumber) {
      maxNumber = numeric;
    }
  }

  const nextNumber = maxNumber + 1;
  const padded = String(nextNumber).padStart(4, "0");
  return `PAC-${padded}`;
}

