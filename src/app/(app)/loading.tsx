export default function AppLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500 dark:border-slate-700 dark:border-t-teal-400"
          role="presentation"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
      </div>
    </div>
  );
}
