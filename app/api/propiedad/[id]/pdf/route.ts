import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PropertyPDF } from "@/components/PropertyPDF";
import React from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  // ?mode=cliente → con datos de la inmobiliaria (teléfono, email, nombre, etc.)
  // ?mode=asesor  → solo info de la propiedad, sin nada de la inmobiliaria
  const mode = _req.nextUrl.searchParams.get("mode") || "cliente";
  const isAsesor = mode === "asesor";

  const [{ data: prop }, { data: imgs }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", params.id).single(),
    supabase.from("property_images").select("url, position, is_cover").eq("property_id", params.id).order("position"),
  ]);

  if (!prop) return new Response("Not found", { status: 404 });

  const { data: agent } = prop.agent_id
    ? await supabase.from("profiles").select("full_name, phone, email").eq("id", prop.agent_id).single()
    : { data: null };

  const sortedImages = (imgs || []).sort(
    (a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || a.position - b.position
  );

  // Modo asesor: biz vacío para que PropertyPDF no muestre nada de la inmobiliaria
  const biz = isAsesor ? {
    name: "",
    phone: "",
    email: "",
    whatsapp: "",
    web: "",
  } : {
    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Duclaud Consultoría Inmobiliaria",
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 746 6272",
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "contacto@duclaud.mx",
    whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272",
    web: "duclaud.mx",
  };

  const element: any = React.createElement(PropertyPDF as any, {
    property: prop,
    images: sortedImages,
    // Modo asesor: tampoco mostrar datos del asesor asignado
    agent: isAsesor ? null : agent,
    biz,
    hideHeader: isAsesor, // PropertyPDF usa esto para ocultar el header "DUCLAUD"
  });

  const stream = await renderToStream(element);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", chunk => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", err => controller.error(err));
    },
  });

  const suffix = isAsesor ? "-asesor" : "-cliente";
  const filename = `DLC-${prop.reference || prop.id.slice(0, 8)}${suffix}.pdf`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
