import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return NextResponse.json({ error: "No API key configurada" }, { status: 500 });

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&region=mx&language=es`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      return NextResponse.json({ error: `No encontrado: ${data.status}` }, { status: 404 });
    }

    const { lat, lng } = data.results[0].geometry.location;
    return NextResponse.json({ lat, lng, formatted: data.results[0].formatted_address });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
