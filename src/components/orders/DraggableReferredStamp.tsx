"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrintStampEdit } from "./PrintViewClient";

const STORAGE_KEY_PREFIX = "print-referred-stamp-position-";

type SavedStamp = { bottom: number; right: number; scale: number };

/** Posición por defecto: bottom 20mm ≈ 76px, right 12mm ≈ 45px (más a la izquierda que el sello principal) */
const DEFAULT_BOTTOM = 76;
const DEFAULT_RIGHT = 120;
const DEFAULT_SCALE = 0.6;
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.8;

function loadSaved(orderId: string, labId: string): SavedStamp | null {
  if (typeof window === "undefined" || !orderId || !labId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${orderId}-${labId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "bottom" in parsed && "right" in parsed) {
      const b = Number((parsed as SavedStamp).bottom);
      const r = Number((parsed as SavedStamp).right);
      const s = Number((parsed as SavedStamp).scale);
      if (!Number.isNaN(b) && !Number.isNaN(r)) {
        return {
          bottom: b,
          right: r,
          scale: Number.isNaN(s) ? DEFAULT_SCALE : Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function save(orderId: string, labId: string, st: SavedStamp) {
  if (typeof window === "undefined" || !orderId || !labId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${orderId}-${labId}`, JSON.stringify(st));
  } catch {
    // ignore
  }
}

type Props = { stampImageUrl: string; orderId: string; labId: string };

export function DraggableReferredStamp({ stampImageUrl, orderId, labId }: Props) {
  const { stampEditMode } = usePrintStampEdit();
  const savedRef = useRef<SavedStamp | null>(null);
  const [position, setPosition] = useState({ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [useCustom, setUseCustom] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, bottom: 0, right: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    savedRef.current = loadSaved(orderId, labId);
    if (savedRef.current) {
      setPosition({ bottom: savedRef.current.bottom, right: savedRef.current.right });
      setScale(savedRef.current.scale);
      setUseCustom(true);
    } else {
      setPosition({ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT });
      setScale(DEFAULT_SCALE);
      setUseCustom(false);
    }
  }, [orderId, labId]);

  const saveCurrent = useCallback(() => {
    const st: SavedStamp = { ...position, scale };
    save(orderId, labId, st);
    savedRef.current = st;
    setUseCustom(true);
  }, [orderId, labId, position, scale]);

  useEffect(() => {
    if (!stampEditMode && (dragging || resizing)) {
      saveCurrent();
    }
  }, [stampEditMode, dragging, resizing, saveCurrent]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!stampEditMode) return;
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      setDragging(true);
      dragStartRef.current = { x: clientX, y: clientY, bottom: position.bottom, right: position.right };
    },
    [stampEditMode, position],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!stampEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      setResizing(true);
      resizeStartRef.current = { x: clientX, y: clientY, scale };
    },
    [stampEditMode, scale],
  );

  useEffect(() => {
    if (dragging) {
      const handleMove = (e: MouseEvent) => {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
          bottom: Math.max(-300, dragStartRef.current.bottom - dy),
          right: Math.max(-400, dragStartRef.current.right - dx),
        });
      };
      const handleEnd = () => {
        setDragging(false);
        saveCurrent();
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
      };
    }
    if (resizing) {
      const handleMove = (e: MouseEvent) => {
        const dy = resizeStartRef.current.y - e.clientY;
        const factor = 1 + dy * 0.008;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, resizeStartRef.current.scale * factor));
        setScale(newScale);
      };
      const handleEnd = () => {
        setResizing(false);
        saveCurrent();
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
      };
    }
    return undefined;
  }, [dragging, resizing, saveCurrent]);

  useEffect(() => {
    if (!resizing) return;
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dy = resizeStartRef.current.y - t.clientY;
      const factor = 1 + dy * 0.008;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, resizeStartRef.current.scale * factor));
      setScale(newScale);
    };
    const handleTouchEnd = () => {
      setResizing(false);
      saveCurrent();
    };
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [resizing, saveCurrent]);

  useEffect(() => {
    if (!dragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - dragStartRef.current.x;
      const dy = t.clientY - dragStartRef.current.y;
      setPosition({
        bottom: Math.max(-300, dragStartRef.current.bottom - dy),
        right: Math.max(-400, dragStartRef.current.right - dx),
      });
    };
    const handleTouchEnd = () => {
      setDragging(false);
      saveCurrent();
    };
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dragging, saveCurrent]);

  const baseW = 263;
  const baseH = 158;
  const width = baseW * scale;
  const height = baseH * scale;
  const showCustom = useCustom || stampEditMode;

  return (
    <div
      className={stampEditMode ? "print-stamp-overlay print-stamp-draggable print-referred-stamp" : "print-stamp-overlay print-referred-stamp"}
      style={
        showCustom
          ? { bottom: `${position.bottom}px`, right: `${position.right}px` }
          : { bottom: `${DEFAULT_BOTTOM}px`, right: `${DEFAULT_RIGHT}px` }
      }
      onMouseDown={stampEditMode ? handleDragStart : undefined}
      onTouchStart={stampEditMode ? handleDragStart : undefined}
      role={stampEditMode ? "button" : undefined}
      tabIndex={stampEditMode ? 0 : undefined}
      aria-label={
        stampEditMode
          ? "Arrastra para mover el sello del laboratorio referido. Usa la esquina para redimensionar."
          : undefined
      }
    >
      {showCustom ? (
        <div className="print-stamp-img-wrapper" style={{ width: `${width}px`, height: `${height}px` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stampImageUrl}
            alt="Sello laboratorio referido"
            className="print-stamp-img"
            draggable={false}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={stampImageUrl}
          alt="Sello laboratorio referido"
          className="print-stamp-img"
          draggable={false}
        />
      )}
      {stampEditMode && (
        <button
          type="button"
          className="print-stamp-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          aria-label="Arrastra para redimensionar"
          title="Arrastra para cambiar tamaño"
        />
      )}
    </div>
  );
}
