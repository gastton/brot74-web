"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";

interface ShowcaseProduct {
  id: number;
  name: string;
  weight: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  imageScale: number;
}

// BRT-133 / rediseño skeleton tobrod.dk: showcase de productos. tobrod
// no tiene una sección de fotos de producto separada (su única foto
// grande es la del hero), pero BROT74 necesita mostrar el pan para
// convertir — se mantiene como sección propia, simplificada al espíritu
// plano de la referencia: foto sin overlay/degradado, nombre y peso
// como caption simple debajo (antes iban superpuestos con un scrim
// oscuro encima de la foto).
//
// Trae los productos reales vía GET /api/products (endpoint público
// existente, sin slotId) en vez de hardcodear rutas de imagen. Si la
// carga falla o no hay productos con foto, la sección no se renderiza.
export default function HomeShowcase() {
  const [products, setProducts] = useState<ShowcaseProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/products -> ${r.status}`);
        return r.json();
      })
      .then((data: ShowcaseProduct[]) => {
        setProducts(data.filter((p) => p.imageUrl).slice(0, 3));
      })
      .catch(() => setProducts([]));
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <section className="bg-white border-t border-navy/10">
      <div className="max-w-[720px] mx-auto px-6 pt-20 md:pt-28">
        <h2 className="text-amber text-[12px] font-bold uppercase tracking-[.2em]">
          Nuestro pan
        </h2>
      </div>

      <Reveal className="mt-10 px-4 md:px-8 pb-20 md:pb-28">
        <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row gap-8 md:gap-6">
          {products.map((p) => (
            <div key={p.id} className="flex-1">
              <div className="relative aspect-[4/5] overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover"
                  style={{
                    backgroundImage: `url(${p.imageUrl})`,
                    backgroundPosition: `${p.focalX}% ${p.focalY}%`,
                    transform: `scale(${p.imageScale})`,
                    transformOrigin: `${p.focalX}% ${p.focalY}%`,
                  }}
                />
              </div>
              <div className="mt-3 text-navy font-semibold text-[15px]">{p.name}</div>
              {p.weight && <div className="text-navy/50 text-[13px] mt-0.5">{p.weight}</div>}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
