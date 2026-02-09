import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatDate } from "@/lib/format";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const search = searchParams.search?.trim();
  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { dni: { contains: search } },
              { code: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Pacientes</CardTitle>
            <form className="flex items-center gap-2" method="GET">
              <input
                name="search"
                defaultValue={search}
                placeholder="Buscar por DNI o nombre..."
                className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              />
              <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                Buscar
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Fecha Nac.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>{patient.code}</TableCell>
                  <TableCell>
                    <Link
                      className="text-slate-900 hover:underline"
                      href={`/patients/${patient.id}`}
                    >
                      {patient.firstName} {patient.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{patient.dni}</TableCell>
                  <TableCell>{formatDate(patient.birthDate)}</TableCell>
                  <TableCell className="text-right">
                    <DeleteButton url={`/api/patients/${patient.id}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
