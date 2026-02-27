import Link from "next/link";
import { redirect } from "next/navigation";


import { getServerSession, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, pageLayoutClasses } from "@/components/layout/PageHeader";
import { DollarSign, BarChart3, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getServerSession();
  if (!hasPermission(session, PERMISSION_REPORTES)) redirect("/dashboard");

  return (
    <div className={pageLayoutClasses.wrapper}>
      <PageHeader
        title="Reportes"
        description="Selecciona el tipo de reporte que deseas consultar"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/reportes/finanzas">
          <Card className="h-full transition-all hover:border-teal-400 hover:shadow-lg dark:hover:border-teal-600">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <CardTitle className="text-lg">Reportes financieros</CardTitle>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Facturación, cobros, pendiente de admisión, terciarización y pre-órdenes.
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reportes/estadisticas">
          <Card className="h-full transition-all hover:border-teal-400 hover:shadow-lg dark:hover:border-teal-600">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <CardTitle className="text-lg">Reportes estadísticos</CardTitle>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Órdenes por estado, por sede, tipo de paciente y análisis más solicitados.
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
