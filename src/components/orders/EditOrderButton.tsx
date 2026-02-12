"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EditOrderDialog } from "./EditOrderDialog";

type Props = {
  orderId: string;
  patientType: string | null;
  requestedBy: string | null;
  notes: string | null;
  disabled?: boolean;
};

export function EditOrderButton({
  orderId,
  patientType,
  requestedBy,
  notes,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Pencil className="h-4 w-4 mr-1" />
        Editar orden
      </Button>
      <EditOrderDialog
        orderId={orderId}
        defaultPatientType={patientType}
        defaultRequestedBy={requestedBy}
        defaultNotes={notes}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
