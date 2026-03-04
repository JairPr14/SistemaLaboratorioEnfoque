import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DatabaseErrorFallback({
  error,
}: {
  error: unknown;
}) {
  const msg = error instanceof Error ? error.message : String(error);
  const isConnection =
    msg.toLowerCase().includes("connect") ||
    msg.toLowerCase().includes("econnrefused") ||
    msg.toLowerCase().includes("ssl") ||
    msg.toLowerCase().includes("enotfound") ||
    msg.toLowerCase().includes("timeout");

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="max-w-lg border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-amber-700 dark:text-amber-400">
            Error de conexión a la base de datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnection ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No se pudo conectar a la base de datos. Verifica:
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ocurrió un error al cargar los datos:
            </p>
          )}
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-500 dark:text-slate-400">
            {isConnection && (
              <>
                <li>
                  <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">DATABASE_URL</code> en Vercel
                </li>
                <li>Que la base de datos en Seenode esté en ejecución</li>
                <li>
                  <Link href="/api/health" className="text-teal-600 hover:underline dark:text-teal-400">
                    /api/health
                  </Link>{" "}
                  para diagnosticar
                </li>
              </>
            )}
            {process.env.NODE_ENV === "development" && (
              <li className="font-mono text-xs text-red-600 dark:text-red-400">{msg}</li>
            )}
          </ul>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="default">
              <Link href="/dashboard">Reintentar</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/health" target="_blank" rel="noopener noreferrer">
                Ver diagnóstico
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
