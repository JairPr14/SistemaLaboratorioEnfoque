import { GestionAdministrativaClient } from "@/components/gestion-administrativa/GestionAdministrativaClient";

export default function GestionAdministrativaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Gestión administrativa clínica</h1>
      <GestionAdministrativaClient />
    </div>
  );
}
