"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Application error:", error);
    // Log en consola para depuración (visible en DevTools)
    console.error("[Error]", error.message, error.digest ? `digest=${error.digest}` : "");
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400">Error</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Ocurrió un error inesperado. Por favor, intente nuevamente.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-500 font-mono">
            Código: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 rounded bg-slate-100 p-4 text-left dark:bg-slate-800">
            <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">Detalles técnicos (solo desarrollo)</summary>
            <pre className="mt-2 overflow-auto text-xs text-slate-700 dark:text-slate-300">{error.message}</pre>
            {error.stack && (
              <pre className="mt-2 overflow-auto text-xs text-slate-700 dark:text-slate-300">{error.stack}</pre>
            )}
          </details>
        )}
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            Intentar de nuevo
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
