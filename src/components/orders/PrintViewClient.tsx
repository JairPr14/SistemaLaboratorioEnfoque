"use client";

import { createContext, useContext, useState } from "react";
import { clsx } from "clsx";
import { PrintToolbar } from "./PrintToolbar";

type PrintStampEditContextValue = {
  stampEditMode: boolean;
  setStampEditMode: (v: boolean) => void;
};

const PrintStampEditContext = createContext<PrintStampEditContextValue | null>(null);

export function usePrintStampEdit() {
  const ctx = useContext(PrintStampEditContext);
  return ctx ?? { stampEditMode: false, setStampEditMode: () => {} };
}

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
  showStampButton?: boolean;
};

type PrintViewClientProps = {
  toolbarProps: PrintToolbarProps;
  children: React.ReactNode;
};

export function PrintViewClient({ toolbarProps, children }: PrintViewClientProps) {
  const [hideWatermarkFooter, setHideWatermarkFooter] = useState(false);
  const [stampEditMode, setStampEditMode] = useState(false);

  return (
    <PrintStampEditContext.Provider value={{ stampEditMode, setStampEditMode }}>
      <div
        className={clsx(
          "print-module-root bg-slate-100 p-4",
          hideWatermarkFooter && "print-hide-watermark-footer",
          stampEditMode && "print-stamp-edit-mode"
        )}
      >
        <PrintToolbar
          {...toolbarProps}
          onToggleWatermarkFooter={() => setHideWatermarkFooter((v) => !v)}
          watermarkFooterHidden={hideWatermarkFooter}
          onToggleStampEdit={() => setStampEditMode((v) => !v)}
          stampEditMode={stampEditMode}
          showStampButton={toolbarProps.showStampButton}
        />
        {children}
      </div>
    </PrintStampEditContext.Provider>
  );
}
