import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PropertyPDF } from "@/components/PropertyPDF";
import React from "react";

export const dynamic  = "force-dynamic";
export const runtime  = "nodejs";

async function fetchMapBase64(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=580x220&markers=${lat},${lng},ol-marker`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const mode     = _req.nextUrl.searchParams.get("mode") || "cliente";
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

  // Fetchear mapa server-side para evitar bloqueos CORS en react-pdf
  const mapImageB64 = (prop.lat && prop.lng)
    ? await fetchMapBase64(Number(prop.lat), Number(prop.lng))
    : null;

  const biz = isAsesor ? { name: "", phone: "", email: "", whatsapp: "", web: "" } : {
    name:      process.env.NEXT_PUBLIC_BUSINESS_NAME     || "Duclaud Consultoría Inmobiliaria",
    phone:     process.env.NEXT_PUBLIC_BUSINESS_PHONE    || "999 303 4815",
    email:     process.env.NEXT_PUBLIC_BUSINESS_EMAIL    || "contacto@duclaud.mx",
    whatsapp:  process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272",
    web:       "duclaud.mx",
  };

  const element: any = React.createElement(PropertyPDF as any, {
    property: prop, images: sortedImages,
    agent: isAsesor ? null : agent,
    biz, hideHeader: isAsesor, mapImageB64,
  });

  const stream = await renderToStream(element);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", chunk => controller.enqueue(chunk));
      stream.on("end",  () => controller.close());
      stream.on("error", err => controller.error(err));
    },
  });

  const suffix   = isAsesor ? "-asesor" : "-cliente";
  const filename = `DLC-${prop.reference || prop.id.slice(0, 8)}${suffix}.pdf`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
