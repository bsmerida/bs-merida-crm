import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat  = req.nextUrl.searchParams.get("lat");
  const lng  = req.nextUrl.searchParams.get("lng");
  const zoom = req.nextUrl.searchParams.get("zoom") || "15";
  const size = req.nextUrl.searchParams.get("size") || "600x300";

  if (!lat || !lng) return new NextResponse("Missing coordinates", { status: 400 });

  // Intentar con OpenStreetMap static, con timeout
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${lat},${lng},ol-marker`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error("Map fetch failed");

    const buffer = await res.arrayBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // Si falla, devuelve una imagen de placeholder SVG convertida a PNG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
      <rect width="600" height="300" fill="#EDE9E1"/>
      <text x="300" y="130" font-family="sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">Mapa no disponible</text>
      <text x="300" y="155" font-family="sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">Lat: ${lat}  ·  Lng: ${lng}</text>
      <text x="300" y="180" font-family="sans-serif" font-size="11" fill="#C4956A" text-anchor="middle">📍 Ver ubicación en Google Maps</text>
    </svg>`;
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
