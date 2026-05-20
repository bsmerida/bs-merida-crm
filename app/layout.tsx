import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duclaud — Consultoría Inmobiliaria",
  description: "Consultoría inmobiliaria con criterio legal y financiero. Compra, venta y renta de propiedades en Yucatán, Quintana Roo y Nuevo León. Socios AMPI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="bg-cream text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
