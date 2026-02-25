"use client";

import { useEffect } from "react";

/**
 * Mide el contenido del informe y aplica una escala unificada a todas las páginas
 * para que se vean igual (mismo tamaño de fuente y layout) en pantalla e impresión.
 * Usa la escala necesaria para la página con más contenido.
 */
export function PrintFitToPage() {
  useEffect(() => {
    const containers = document.querySelectorAll(".print-a4");
    if (!containers.length) return;

    const applyUnifiedScale = () => {
      let maxContentHeight = 0;
      let containerHeight = 0;

      containers.forEach((container) => {
        const content = container.querySelector(".print-a4-content");
        if (!content) return;
        const rect = container.getBoundingClientRect();
        containerHeight = rect.height;
        const contentH = (content as HTMLElement).scrollHeight;
        maxContentHeight = Math.max(maxContentHeight, contentH);
      });

      // Escala unificada: la misma para todas las páginas (según la de más contenido)
      const unifiedScale =
        maxContentHeight > 0 && containerHeight > 0 ? Math.min(1, containerHeight / maxContentHeight) : 1;

      containers.forEach((container) => {
        const scaler = container.querySelector(".print-a4-scaler");
        const content = container.querySelector(".print-a4-content");
        if (!scaler || !content) return;

        const containerRect = container.getBoundingClientRect();
        const contentHeight = (content as HTMLElement).scrollHeight;
        const scalerEl = scaler as HTMLElement;

        if (unifiedScale < 1) {
          scalerEl.style.height = `${contentHeight}px`;
          scalerEl.style.width = `${100 / unifiedScale}%`;
          scalerEl.style.transformOrigin = "top left";
          scalerEl.style.transform = `scale(${unifiedScale})`;
        } else {
          scalerEl.style.height = "";
          scalerEl.style.width = "";
          scalerEl.style.transform = "";
          scalerEl.style.transformOrigin = "";
        }
      });
    };

    applyUnifiedScale();

    const resizeObserver = new ResizeObserver(applyUnifiedScale);
    containers.forEach((c) => resizeObserver.observe(c));

    const timeout = window.setTimeout(applyUnifiedScale, 400);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
