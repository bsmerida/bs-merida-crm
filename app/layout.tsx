import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inmobiliaria BS Mérida — Venta y Renta de Inmuebles en Yucatán",
  description:
    "Asesoría inmobiliaria certificada AMPI. Compra, venta y renta de propiedades en Yucatán, Quintana Roo y Nuevo León.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
