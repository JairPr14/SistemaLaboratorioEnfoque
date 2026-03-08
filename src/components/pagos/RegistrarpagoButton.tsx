"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";

const CashierDialog = dynamic(() => import("./CashierDialog").then((m) => m.CashierDialog), {
  ssr: false,
});

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
