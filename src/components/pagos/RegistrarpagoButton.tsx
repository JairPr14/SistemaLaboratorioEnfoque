"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CashierDialog } from "./CashierDialog";

export function RegistrarpagoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Receipt className="h-4 w-4" />
        Registrar pago
      </Button>
      <CashierDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
