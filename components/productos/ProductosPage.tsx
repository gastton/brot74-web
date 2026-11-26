import Image from "next/image";
import Link from "next/link";
import { FLOUR_LABELS, FLOUR_TYPES, flourLevel, type FlourType } from "@/lib/flourType";
import "./ProductosPage.css";

// /productos: catálogo fijo en tarjetas verticales, con la estética de la landing
// (tokens de HomeLanding.css, Jost 300 en títulos) pero con CSS propio, sin tocarla.
// Todas las tarjetas pesan lo mismo; en desktop van en 2 columnas con las pares
// más abajo, y en mobile una debajo de otra en el mismo orden.
// Diseño de referencia: lienzo "BROT 74 · Página Productos", versión 3.
export interface ProductoEditorial {
  id: number;
  name: string;
  description: string;
  weight: string;
  ingredients: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  flourType: string;
}

const INSTAGRAM_URL = "https://www.instagram.com/brot.74";
// Mismo destino que los botones de la landing: el flujo de pedidos en la pantalla de fechas.
const FLOW_URL = "/?step=slots";

function StatusLink({ open }: { open: boolean }) {
  return (
    <Link className="btn st" href={FLOW_URL}>
      <span className="st-dot" aria-hidden="true" />
      {open ? "Elegí tu BROT" : "Tu próximo BROT"}
    </Link>
  );
}

// Escala de harina: 3 pasos que se llenan (blanco → semi → integral), con el nombre
// al lado para no depender solo del color. Sin dato cargado no se muestra.
function EscalaHarina({ value }: { value: string }) {
  const level = flourLevel(value);
  if (level === 0) return null;
  const label = FLOUR_LABELS[value as FlourType];
  return (
    <span className="escala">
      <span className="escala-pasos" aria-hidden="true">
        {FLOUR_TYPES.map((t, i) => (
          <span key={t} className={i < level ? `on paso-${i + 1}` : undefined} />
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}

function Tarjeta({ p, n, total }: { p: ProductoEditorial; n: number; total: number }) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    <article className="tarjeta" id={`producto-${p.id}`}>
      <div className="tarjeta-top">
        <span>{pad(n)} / {pad(total)}</span>
        <EscalaHarina value={p.flourType} />
      </div>

      <div className="foto">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            sizes="(min-width: 861px) 45vw, 100vw"
            priority={n <= 2}
            style={{ objectFit: "cover", objectPosition: `${p.focalX}% ${p.focalY}%` }}
          />
        ) : (
          <span className="foto-vacia" aria-hidden="true">{p.name}</span>
        )}
      </div>

      {p.description && <p className="bajada">{p.description}</p>}

      <div className="nombre">
        <h2>{p.name}</h2>
        <span>[{p.weight ? `${p.weight} · ` : ""}masa madre]</span>
      </div>

      {p.ingredients && (
        <p className="ingredientes">
          <span>Ingredientes</span>
          {p.ingredients}
        </p>
      )}
    </article>
  );
}

export default function ProductosPage({ products, open }: { products: ProductoEditorial[]; open: boolean }) {
  return (
    <div className={`brot-productos${open ? "" : " cerrado"}`}>
      <header className="bar">
        <div className="wrap">
          <Link className="brand" href="/">
            <Image src="/assets/logo-sello-mono-navy-transparente.png" alt="" width={2400} height={2400} />
            <span>BROT <em>74</em></span>
          </Link>
          <nav className="nav">
            <Link className="hide-m" href="/#pedir">Cómo pedir</Link>
            <StatusLink open={open} />
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap intro">
          <div className="rule" />
          <div className="eyebrow">Productos</div>
          <h1>Lo que sale del horno.</h1>
          <p>
            Pocos panes, hechos con harinas, agua, sal y tiempo. Qué sale en cada tanda depende de la fecha:
            lo ves al elegirla.
          </p>
        </div>

        <div className="wrap tarjetas">
          {products.map((p, i) => (
            <Tarjeta key={p.id} p={p} n={i + 1} total={products.length} />
          ))}
        </div>

        <section className="cierre">
          <div className="wrap">
            <h2>¿Cuál va a ser tu BROT?</h2>
            <div className="cierre-actions">
              <StatusLink open={open} />
              <Link className="link" href="/#pedir">Cómo pedir</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="ft">
        <div className="wrap">
          <span>© 2026 BROT 74</span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@brot.74</a>
          <span>Harinas, agua y sal</span>
        </div>
      </footer>
    </div>
  );
}
