"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

// Fade + translateY al entrar en viewport, vía IntersectionObserver.
// Mismo patrón que ya usa app/como-se-hizo/page.tsx (su propio .reveal
// scoped a esa página) — acá como componente reusable para las secciones
// nuevas del home (BRT-131, BRT-132...). Respeta prefers-reduced-motion.
export default function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Lazy initializer (no un efecto) para que el caso reduced-motion no
  // dispare un setState síncrono dentro de un effect.
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (visible) return; // ya resuelto por el estado inicial (reduced motion)
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={`brot-reveal${visible ? " in" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
