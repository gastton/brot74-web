// BRT-130: footer del home, extraído tal cual del render de HomeContent.
// Va siempre al final del stack de secciones, después de la sección de
// Pedidos (BRT-135).
export default function HomeFooter() {
  return (
    <footer
      style={{
        background: "#0E233C",
        borderTop: "1px solid rgba(249,245,236,.08)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: "10.5px",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(249,245,236,.42)",
        }}
      >
        Powered by
      </span>
      <a href="https://luontek.com/" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/luontek-horizontal-oscuro.svg"
          alt="Luontek"
          style={{ height: "18px", width: "auto", display: "block" }}
        />
      </a>
    </footer>
  );
}
