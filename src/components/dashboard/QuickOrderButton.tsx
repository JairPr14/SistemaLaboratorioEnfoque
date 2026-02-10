"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuickOrderModal } from "@/components/orders/QuickOrderModal";
import { Plus } from "lucide-react";

export function QuickOrderButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
        <Plus className="h-4 w-4" />
        Nueva Orden
      </Button>
      <QuickOrderModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
