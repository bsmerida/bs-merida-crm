"use client";
// Último recurso: si falla el layout principal. Debe traer su propio <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-MX">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 22 }}>Algo salió mal</h1>
          <p style={{ color: "#555", fontSize: 14 }}>Intenta de nuevo o recarga la página.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#0D1B2A", color: "#fff", cursor: "pointer" }}>
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
