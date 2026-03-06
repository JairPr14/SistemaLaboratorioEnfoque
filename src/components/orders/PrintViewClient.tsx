"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { PrintToolbar } from "./PrintToolbar";

type PrintToolbarProps = {
  patientName: string;
  patientPhone?: string | null;
  analysesNames: string;
  date: string;
  orderCode?: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  backHref?: string;
  toggleLogoUrl?: string;
  showLogoButton?: boolean;
  logoVisible?: boolean;
};

type PrintViewClientProps = {
  toolbarProps: PrintToolbarProps;
  children: React.ReactNode;
};

export function PrintViewClient({ toolbarProps, children }: PrintViewClientProps) {
  const [hideWatermarkFooter, setHideWatermarkFooter] = useState(false);

  return (
    <div
      className={clsx(
        "print-module-root bg-slate-100 p-4",
        hideWatermarkFooter && "print-hide-watermark-footer"
      )}
    >
      <PrintToolbar
        {...toolbarProps}
        onToggleWatermarkFooter={() => setHideWatermarkFooter((v) => !v)}
        watermarkFooterHidden={hideWatermarkFooter}
      />
      {children}
    </div>
  );
}
