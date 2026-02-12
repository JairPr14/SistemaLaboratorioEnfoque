"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error crítico
    logger.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 text-center">
            <h1 className="text-4xl font-bold text-red-600">Error Crítico</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Ha ocurrido un error crítico en la aplicación. Por favor, recargue la página.
            </p>
            <button
              onClick={reset}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
