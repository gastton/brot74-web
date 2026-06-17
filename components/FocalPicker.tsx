"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import React from "react";

interface FocalPickerProps {
  imageUrl: string;
  focalX: number;
  focalY: number;
  scale?: number;
  onChange: (x: number, y: number) => void;
  onScaleChange?: (scale: number) => void;
  containerClass?: string;
  overlay?: React.ReactNode;
}

export default function FocalPicker({ imageUrl, focalX, focalY, scale = 1, onChange, onScaleChange, containerClass = "aspect-square", overlay }: FocalPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getPos = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
    onChange(x, y);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Arrastrá para enfocar el recuadre</p>
      <div
        ref={ref}
        className={`relative ${containerClass} w-full overflow-hidden rounded-xl cursor-crosshair select-none touch-none`}
        onMouseDown={(e) => { dragging.current = true; getPos(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (dragging.current) getPos(e.clientX, e.clientY); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={(e) => { dragging.current = true; getPos(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={(e) => { if (dragging.current) getPos(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={() => { dragging.current = false; }}
      >
        <Image
          src={imageUrl}
          alt="Focal preview"
          fill
          className="object-cover pointer-events-none"
          style={{ objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${scale})`, transformOrigin: `${focalX}% ${focalY}%` }}
          sizes="400px"
        />
        {overlay && <div className="absolute inset-0 pointer-events-none">{overlay}</div>}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 h-px bg-white/30" style={{ top: `${focalY}%` }} />
          <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${focalX}%` }} />
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${focalX}%`, top: `${focalY}%` }}
          />
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
            Arrastrá para enfocar
          </span>
        </div>
      </div>
      {onScaleChange && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-muted shrink-0">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={scale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="flex-1 accent-amber"
          />
          <span className="text-xs text-muted w-8 text-right shrink-0">{Math.round(scale * 100)}%</span>
        </div>
      )}
    </div>
  );
}
