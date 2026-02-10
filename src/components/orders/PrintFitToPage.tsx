"use client";

import { useEffect } from "react";

/**
 * Mide el contenido del informe y aplica una escala al wrapper para que todo
 * quepa en una sola hoja A4 cuando el contenido sobrepasa la altura.
 */
export function PrintFitToPage() {
  useEffect(() => {
    const container = document.querySelector(".print-a4");
    const scaler = document.querySelector(".print-a4-scaler");
    const content = document.querySelector(".print-a4-content");
    if (!container || !scaler || !content) return;

    const applyScale = () => {
      const containerRect = container.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const contentHeight = (content as HTMLElement).scrollHeight;
      const scale = contentHeight > containerHeight ? containerHeight / contentHeight : 1;

      const scalerEl = scaler as HTMLElement;
      if (scale < 1) {
        scalerEl.style.height = `${contentHeight}px`;
        scalerEl.style.width = `${100 / scale}%`;
        scalerEl.style.transformOrigin = "top left";
        scalerEl.style.transform = `scale(${scale})`;
      } else {
        scalerEl.style.height = "";
        scalerEl.style.width = "";
        scalerEl.style.transform = "";
        scalerEl.style.transformOrigin = "";
      }
    };

    applyScale();

    const resizeObserver = new ResizeObserver(applyScale);
    resizeObserver.observe(container);

    const timeout = window.setTimeout(applyScale, 400);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
