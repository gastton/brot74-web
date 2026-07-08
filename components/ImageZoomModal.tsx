"use client";

import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageZoomModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageZoomModal({ src, alt = "", onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDist = useRef<number | null>(null);

  const MIN = 1;
  const MAX = 4;
  const STEP = 0.5;

  function clamp(v: number) { return Math.min(MAX, Math.max(MIN, v)); }

  // Scroll to zoom (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.002));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pinch to zoom (mobile)
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastDist.current !== null) {
      setScale((s) => clamp(s * (dist / lastDist.current!)));
    }
    lastDist.current = dist;
  }

  function onTouchEnd() { lastDist.current = null; }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setScale((s) => clamp(s - STEP))}
            disabled={scale <= MIN}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/70 text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => clamp(s + STEP))}
            disabled={scale >= MAX}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center cursor-zoom-in"
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setScale(s => s > MIN ? MIN : 2)}
      >
        <div style={{ transform: `scale(${scale})`, transition: "transform 0.1s ease", transformOrigin: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
}
