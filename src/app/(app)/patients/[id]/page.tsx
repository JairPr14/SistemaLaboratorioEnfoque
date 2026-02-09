import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: { id: string } };

export default async function PatientDetailPage({ params }: Props) {
  const patient = await prisma.patient.findFirst({
    where: { id: params.id, deletedAt: null },
  });

  if (!patient) {
    notFound();
  }

  const birthDate = patient.birthDate.toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar paciente</CardTitle>
      </CardHeader>
      <CardContent>
        <PatientForm
          patientId={patient.id}
          defaultValues={{
            code: patient.code,
            dni: patient.dni,
            firstName: patient.firstName,
            lastName: patient.lastName,
            birthDate,
            sex: patient.sex,
            phone: patient.phone ?? "",
            address: patient.address ?? "",
            email: patient.email ?? "",
          }}
        />
      </CardContent>
    </Card>
  );
}
