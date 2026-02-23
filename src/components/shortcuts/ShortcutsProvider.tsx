"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key == null || typeof e.key !== "string") return;
      const typing = isTypingTarget(e.target);
      const key = e.key.toLowerCase();

      // Ctrl/Cmd + K: abre búsqueda global incluso escribiendo
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcuts:open-search"));
        return;
      }

      // Shift + ? -> ayuda de atajos
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // El resto no debe disparar si está escribiendo
      if (typing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcuts:save-draft"));
        return;
      }

      if (e.altKey && key === "v") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcuts:validate"));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === "p") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcuts:print"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {children}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Ayuda de atajos
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <li><span className="font-semibold">Ctrl/Cmd + K</span> — Abrir buscador global</li>
            <li><span className="font-semibold">Ctrl/Cmd + Enter</span> — Guardar borrador (captura)</li>
            <li><span className="font-semibold">Alt + V</span> — Validar resultado actual</li>
            <li><span className="font-semibold">Ctrl/Cmd + P</span> — Imprimir resultado actual</li>
            <li><span className="font-semibold">Shift + ?</span> — Mostrar esta ayuda</li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
