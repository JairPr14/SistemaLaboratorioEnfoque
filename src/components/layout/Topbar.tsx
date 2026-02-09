import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Gestión de Laboratorio
        </h1>
        <p className="text-sm text-slate-500">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      <div className="w-72">
        <Input placeholder="Buscar paciente, DNI u orden..." />
      </div>
    </header>
  );
}
