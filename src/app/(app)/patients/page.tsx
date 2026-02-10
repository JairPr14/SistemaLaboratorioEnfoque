import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatDate } from "@/lib/format";

type Props = {
  searchParams: Promise<{ search?: string }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search?.trim();

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
    <div className="space-y-8 min-w-0">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Pacientes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registre pacientes y consulte el listado.
        </p>
      </div>

      {/* 1. Registro de paciente (primero) */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Nuevo paciente
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro de paciente</CardTitle>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Complete los datos para dar de alta un paciente.
            </p>
          </CardHeader>
          <CardContent>
            <PatientForm />
          </CardContent>
        </Card>
      </section>

      {/* 2. Buscar paciente */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Listado de pacientes
        </h2>
        <form method="GET" className="mb-4">
          <label htmlFor="patient-search" className="sr-only">
            Buscar paciente
          </label>
          <input
            id="patient-search"
            name="search"
            type="text"
            defaultValue={search}
            placeholder="Buscar paciente"
            className="w-full min-w-0 rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <button
            type="submit"
            className="mt-2 w-full sm:w-auto rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Buscar
          </button>
        </form>

        {/* 3. Catálogo / listado */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {patients.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">
                  {search
                    ? "Ningún paciente coincide con la búsqueda."
                    : "No hay pacientes registrados."}
                </p>
                {!search && (
                  <p className="text-xs text-slate-400 mt-1">
                    Use el formulario de arriba para registrar uno.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Fecha Nac.</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-mono text-sm">{patient.code}</TableCell>
                        <TableCell>
                          <Link
                            className="font-medium text-slate-900 hover:underline"
                            href={`/patients/${patient.id}`}
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>{patient.dni}</TableCell>
                        <TableCell>{formatDate(patient.birthDate)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-sm text-slate-600 hover:text-slate-900 hover:underline mr-2"
                          >
                            Editar
                          </Link>
                          <DeleteButton url={`/api/patients/${patient.id}`} label="Eliminar" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
