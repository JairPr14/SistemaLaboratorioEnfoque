"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { ageGroupValues, sexValues } from "@/features/lab/schemas";

type Props = {
  itemIndex: number;
};

export function RefRangesManager({ itemIndex }: Props) {
  const form = useFormContext();
  const [open, setOpen] = useState(false);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `items.${itemIndex}.refRanges`,
  });

  const addRange = () => {
    append({
      ageGroup: null,
      sex: null,
      refRangeText: "",
      refMin: undefined,
      refMax: undefined,
      order: fields.length,
    });
  };

  const ageGroupLabels: Record<string, string> = {
    NIÑOS: "Niños",
    JOVENES: "Jóvenes",
    ADULTOS: "Adultos",
  };

  const sexLabels: Record<string, string> = {
    M: "Hombres",
    F: "Mujeres",
    O: "Otros",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          Rangos de referencia
          {fields.length > 0 && (
            <span className="ml-1 text-slate-500 dark:text-slate-400">({fields.length})</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Valores Referenciales</DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure múltiples rangos según edad y sexo. Si no especifica edad/sexo, será el valor por defecto.
          </p>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button type="button" onClick={addRange} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar rango
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p>No hay rangos configurados.</p>
              <p className="text-sm mt-1">Agrega un rango para definir valores referenciales específicos.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Grupo de edad</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Texto</TableHead>
                    <TableHead className="w-24">Mínimo</TableHead>
                    <TableHead className="w-24">Máximo</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                      <TableCell>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          {...form.register(`items.${itemIndex}.refRanges.${idx}.ageGroup`, {
                            setValueAs: (v) => (v === "" ? null : v),
                          })}
                        >
                          <option value="">Todos</option>
                          {ageGroupValues.map((ag) => (
                            <option key={ag} value={ag}>
                              {ageGroupLabels[ag] ?? ag}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          {...form.register(`items.${itemIndex}.refRanges.${idx}.sex`, {
                            setValueAs: (v) => (v === "" ? null : v),
                          })}
                        >
                          <option value="">Todos</option>
                          {sexValues.map((s) => (
                            <option key={s} value={s}>
                              {sexLabels[s] ?? s}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-9 text-sm"
                          placeholder="Ej: 5,000 - 10,000"
                          {...form.register(`items.${itemIndex}.refRanges.${idx}.refRangeText`, {
                            setValueAs: (v) => (v === "" ? null : v),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9 text-sm"
                          placeholder="Min"
                          {...form.register(`items.${itemIndex}.refRanges.${idx}.refMin`, {
                            setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9 text-sm"
                          placeholder="Max"
                          {...form.register(`items.${itemIndex}.refRanges.${idx}.refMax`, {
                            setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
