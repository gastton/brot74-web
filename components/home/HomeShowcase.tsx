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

// BRT-133: cuarta sección del home — showcase de productos. Acá es donde
// de verdad se aplica la referencia de tobrod.dk (fotografía de producto
// a pantalla casi completa, sin cards/sombras) — las secciones de texto
// anteriores (Historia, Ingredientes) tomaron otro camino editorial, pero
// esta es fotografía pura. Fondo crema (vs. el navy de las dos
// anteriores) para que la foto respire y para variar el ritmo del scroll.
//
// Trae los productos reales vía GET /api/products (sin slotId — listado
// público sin stock, mismo endpoint que ya existe) en vez de hardcodear
// rutas de imagen: así siempre muestra lo que hay activo en catálogo,
// también en producción. Si la carga falla o no hay productos con foto,
// la sección no se renderiza (nada roto, simplemente no aparece).
export default function HomeShowcase() {
  const [products, setProducts] = useState<ShowcaseProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: ShowcaseProduct[]) => {
        setProducts(data.filter((p) => p.imageUrl).slice(0, 3));
      })
      .catch(() => setProducts([]));
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <section className="bg-cream">
      <div className="text-center pt-20 md:pt-28">
        <p className="brot-hero-kicker">Nuestro pan</p>
      </div>

      <Reveal className="mt-10 md:mt-14">
        <div className="flex flex-col md:flex-row">
          {products.map((p) => (
            <div
              key={p.id}
              className="relative w-full md:flex-1 aspect-[4/5] md:aspect-auto md:h-[78vh] overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-cover"
                style={{
                  backgroundImage: `url(${p.imageUrl})`,
                  backgroundPosition: `${p.focalX}% ${p.focalY}%`,
                  transform: `scale(${p.imageScale})`,
                  transformOrigin: `${p.focalX}% ${p.focalY}%`,
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(14,35,60,.55), rgba(14,35,60,0))" }}
              />
              <div className="absolute bottom-0 left-0 p-6 md:p-8">
                <div className="text-cream font-bold text-[22px] md:text-[24px] leading-tight">
                  {p.name}
                </div>
                {p.weight && (
                  <div className="text-cream/75 text-[13px] font-medium mt-1">{p.weight}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
