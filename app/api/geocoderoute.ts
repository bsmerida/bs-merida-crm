import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
    { headers: { "User-Agent": "BSMerida-CRM/1.0 (bsmerida19@gmail.com)", "Accept-Language": "es" } }
  );

  const data = await res.json();
  if (!data[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ lat: Number(data[0].lat), lng: Number(data[0].lon) });
}
