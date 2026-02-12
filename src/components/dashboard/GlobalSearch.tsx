"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type SearchResult = {
  id: string;
  type: "patient" | "order";
  label: string;
  sublabel: string;
  href: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ patients: SearchResult[]; orders: SearchResult[] }>({ patients: [], orders: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const allResults = [...results.patients, ...results.orders].slice(0, 8);

  useEffect(() => {
    setSelectedIndex((i) => (allResults.length ? Math.min(i, allResults.length - 1) : 0));
  }, [allResults.length]);

  const fetchResults = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults({ patients: [], orders: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults({
        patients: data.patients ?? [],
        orders: data.orders ?? [],
      });
      setSelectedIndex(0);
    } catch {
      setResults({ patients: [], orders: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchResults(query), 200);
    return () => clearTimeout(t);
  }, [query, fetchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if (!open || allResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        router.push(allResults[selectedIndex].href);
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, allResults, selectedIndex, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <Input
          ref={inputRef}
          placeholder="Buscar paciente, DNI u orden..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-20"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-600 dark:text-slate-500">
          ⌘K
        </kbd>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Buscando...</div>
          ) : allResults.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {query.trim().length < 2 ? "Escribe al menos 2 caracteres (paciente, DNI o código de orden)" : "Sin resultados"}
            </div>
          ) : (
            allResults.map((r, i) => (
              <a
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(r.href);
                  setOpen(false);
                  setQuery("");
                }}
                className={`block px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${i === selectedIndex ? "bg-slate-50 dark:bg-slate-700" : ""}`}
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{r.label}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">{r.sublabel}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
