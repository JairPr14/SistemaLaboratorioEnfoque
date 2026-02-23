"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { FileText, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Template = {
  id: string;
  code: string;
  title: string;
  text: string;
  isActive: boolean;
};

export function PreAnalyticNotePicker({
  orderId,
  initialValue,
  canEdit,
}: {
  orderId: string;
  initialValue: string | null;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState(initialValue ?? "");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/config/preanaliticos");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
        setTemplates((data.items ?? []).filter((x: Template) => x.isActive));
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.code.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        t.text.toLowerCase().includes(term),
    );
  }, [templates, search]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const insertTemplate = () => {
    if (!selected) return;
    setNote((prev) => {
      const base = prev.trim();
      if (!base) return selected.text;
      return `${base}\n${selected.text}`;
    });
  };

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preAnalyticNote: note.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Observación preanalítica guardada");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const hasNote = Boolean(initialValue?.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasNote ? "default" : "outline"}
          size="sm"
          className={hasNote ? "gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" : "gap-1.5"}
        >
          {hasNote ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Obs. preanalíticas
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Obs. preanalíticas
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Observaciones preanalíticas</DialogTitle>
          <DialogDescription>
            Inserta plantillas rápidas y guarda observaciones para esta orden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="preSearch">Buscar plantilla</Label>
              <Input
                id="preSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="hemólisis, ayuno..."
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preSelect">Plantilla</Label>
              <select
                id="preSelect"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                disabled={loading}
              >
                <option value="">Seleccionar...</option>
                {filtered.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selected && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Vista previa:
              </p>
              {selected.text}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="preNote">Observación</Label>
            <textarea
              id="preNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder="Escribe observaciones preanalíticas..."
              disabled={!canEdit}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={insertTemplate}
              disabled={!selected || !canEdit}
            >
              Insertar plantilla
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !canEdit}>
              {saving ? "Guardando..." : "Guardar observación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
