import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PropertyPDF } from "@/components/PropertyPDF";
import React from "react";
 
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
 
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
 
  // ?mode=public → oculta datos de contacto (para compartir con cliente externo)
  // ?mode=internal (default) → muestra todo
  const mode = _req.nextUrl.searchParams.get("mode") || "internal";
  const showContactInfo = mode !== "public";
 
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
 
  const biz = {
    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Inmobiliaria BS Mérida",
    phone: showContactInfo ? (process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815") : null,
    email: showContactInfo ? (process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com") : null,
    whatsapp: showContactInfo ? (process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272") : null,
    web: "bsmerida.com",
  };
 
  // Si es modo público, no pasar datos del asesor
  const agentData = showContactInfo ? agent : null;
 
  const element: any = React.createElement(PropertyPDF as any, {
    property: prop,
    images: sortedImages,
    agent: agentData,
    biz,
    showContactInfo,
  });
 
  const stream = await renderToStream(element);
 
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", chunk => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", err => controller.error(err));
    },
  });
 
  const suffix = mode === "public" ? "-cliente" : "";
  const filename = `BS-${prop.reference || prop.id.slice(0, 8)}${suffix}.pdf`;
 
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
