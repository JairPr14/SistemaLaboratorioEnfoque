import { prisma } from "@/lib/prisma";

/** Genera el siguiente código correlativo de paciente: PAC-0001, PAC-0002, ... */
export async function generateNextPatientCode() {
  const last = await prisma.patient.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  let nextNumber = 1;

  if (last?.code && last.code.startsWith("PAC-")) {
    const numeric = parseInt(last.code.slice(4), 10);
    if (!Number.isNaN(numeric) && numeric >= 1) {
      nextNumber = numeric + 1;
    }
  }

  const padded = String(nextNumber).padStart(4, "0");
  return `PAC-${padded}`;
}

