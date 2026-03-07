"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft, ImagePlus, ImageMinus, EyeOff, Move, RotateCcw, Settings2, ChevronDown } from "lucide-react";

const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type PrintToolbarProps = {
  patientName: string;
  patientPhone?: string | null;
  analysesNames: string;
  date: string;
  /** Código de orden (ej. ENF001) para el nombre del PDF guardado */
  orderCode?: string;
  /** Nombre y apellido por separado para el archivo PDF: Nombre-Apellido-codigoOrden */
  patientFirstName?: string | null;
  patientLastName?: string | null;
  /** URL de destino al retroceder (ej. /orders/{id}). Si no se pasa, usa router.back() */
  backHref?: string;
  /** URL para alternar visibilidad del logo del lab referido (mostrar/ocultar) */
  toggleLogoUrl?: string;
  /** Mostrar botón solo cuando hay logo de lab referido disponible */
  showLogoButton?: boolean;
  /** Si el logo está actualmente visible */
  logoVisible?: boolean;
  /** Callback para alternar marca de agua y footer */
  onToggleWatermarkFooter?: () => void;
  /** Si la marca de agua y footer están ocultos */
  watermarkFooterHidden?: boolean;
  /** Callback para alternar modo de edición del sello (posición y tamaño) */
  onToggleStampEdit?: () => void;
  /** Si el modo edición del sello está activo */
  stampEditMode?: boolean;
  /** Mostrar botón de modificar lugar de firma (solo cuando hay sello) */
  showStampButton?: boolean;
  /** ID de la orden para restaurar posiciones de firma/logo/sellos */
  orderId?: string;
  /** IDs de laboratorios referidos con sello (para limpiar sus posiciones) */
  referredLabIdsWithStamp?: string[];
};

/** Genera nombre de archivo PDF: Nombre-Apellido-codigoOrden (ej. CesarJair-PalaciosRodas-ENF001) */
function buildPdfFilename(
  patientName: string,
  orderCode: string,
  firstName?: string | null,
  lastName?: string | null
): string {
  const sanitize = (s: string) => s.replace(/\s+/g, "").replace(/[/\\:*?"<>|]/g, "");
  const codePart = orderCode.replace(/[/\\:*?"<>|]/g, "");
  let namePart: string;
  if (typeof firstName === "string" && typeof lastName === "string" && (firstName.trim() || lastName.trim())) {
    namePart = `${sanitize(firstName)}-${sanitize(lastName)}`;
  } else {
    namePart = patientName.replace(/\s+/g, "").replace(/[/\\:*?"<>|]/g, "");
  }
  return codePart ? `${namePart}-${codePart}` : namePart;
}

export function PrintToolbar({
  patientName,
  patientPhone,
  analysesNames,
  date,
  orderCode,
  patientFirstName,
  patientLastName,
  backHref,
  toggleLogoUrl,
  showLogoButton,
  logoVisible = true,
  onToggleWatermarkFooter,
  watermarkFooterHidden = false,
  onToggleStampEdit,
  stampEditMode = false,
  showStampButton = false,
  orderId,
  referredLabIdsWithStamp = [],
}: PrintToolbarProps) {
  const router = useRouter();
  const [configOpen, setConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(e.target as Node)) {
        setConfigOpen(false);
      }
    };
    if (configOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [configOpen]);

  const handleRestorePositions = () => {
    if (!orderId) return;
    try {
      localStorage.removeItem(`print-stamp-position-${orderId}`);
      localStorage.removeItem(`print-referred-logo-position-${orderId}`);
      for (const labId of referredLabIdsWithStamp) {
        localStorage.removeItem(`print-referred-stamp-position-${orderId}-${labId}`);
      }
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(`print-referred-stamp-position-${orderId}-`)) {
          localStorage.removeItem(key);
        }
      });
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const handleSavePdf = () => {
    const baseTitle = document.title;
    const pdfTitle = orderCode ? buildPdfFilename(patientName, orderCode, patientFirstName, patientLastName) : patientName;
    document.title = pdfTitle;
    const onAfterPrint = () => {
      document.title = baseTitle;
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const handleWhatsApp = () => {
    const message = `Estimado *${patientName}*, somos de Clínica Enfoque Salud, adjuntamos sus resultados:\n*${analysesNames}*, *${date}* adjunto pdf:`;
    const text = encodeURIComponent(message);
    let url: string;
    if (patientPhone?.trim()) {
      const digits = patientPhone.replace(/\D/g, "");
      const phone = digits.startsWith("51") ? digits : `51${digits}`;
      url = `https://wa.me/${phone}?text=${text}`;
    } else {
      url = `https://wa.me/?text=${text}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="print-toolbar print-keep mb-4 flex flex-wrap items-center justify-between gap-3">
      {backHref ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={backHref} className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Retroceder
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          Retroceder
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {(onToggleWatermarkFooter || showStampButton || showLogoButton) && (
          <div ref={configRef} className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1"
              onClick={() => setConfigOpen((o) => !o)}
            >
              <Settings2 className="h-4 w-4" />
              Configurar PDF
              <ChevronDown
                className={`h-4 w-4 transition-transform ${configOpen ? "rotate-180" : ""}`}
              />
            </Button>
            {configOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[240px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-1">
                {onToggleWatermarkFooter && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onToggleWatermarkFooter();
                      setConfigOpen(false);
                    }}
                    className="justify-start gap-2 h-9"
                  >
                    <EyeOff className="h-4 w-4" />
                    {watermarkFooterHidden ? "Mostrar marca de agua y footer" : "Quitar marca de agua y footer"}
                  </Button>
                )}
                {showStampButton && onToggleStampEdit && (
                  <Button
                    type="button"
                    variant={stampEditMode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      onToggleStampEdit();
                      setConfigOpen(false);
                    }}
                    className="justify-start gap-2 h-9"
                  >
                    <Move className="h-4 w-4" />
                    {stampEditMode ? "Listo (posición guardada)" : "Modificar lugar de firma"}
                  </Button>
                )}
                {showStampButton && orderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleRestorePositions();
                      setConfigOpen(false);
                    }}
                    className="justify-start gap-2 h-9"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar posición
                  </Button>
                )}
                {showLogoButton && toggleLogoUrl && (
                  <Button type="button" variant="ghost" size="sm" asChild className="justify-start gap-2 h-9">
                    <Link href={toggleLogoUrl}>
                      {logoVisible ? (
                        <>
                          <ImageMinus className="h-4 w-4" />
                          Quitar logo referido
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" />
                          Poner logo referido
                        </>
                      )}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            )}
          </div>
        )}
        <Button type="button" variant="default" size="sm" onClick={handleSavePdf}>
          <FileDown className="h-4 w-4" />
          Guardar PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="text-green-700 border-green-600 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-950/30"
        >
          {WHATSAPP_SVG}
          Enviar por WhatsApp
        </Button>
      </div>
    </div>
  );
}
