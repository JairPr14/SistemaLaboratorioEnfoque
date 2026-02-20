import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
          404
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Página no encontrada. La ruta que buscas no existe o fue movida.
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Link href="/dashboard" className={buttonVariants()}>
            Ir al inicio
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
