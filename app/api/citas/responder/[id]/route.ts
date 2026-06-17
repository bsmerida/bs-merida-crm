// app/api/citas/responder/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailClienteConfirmado, emailClienteNuevasOpciones, sendEmail } from "@/lib/emails";

const FALLBACK_AGENT_ID = "15f01899-4206-4613-bb01-e26ea4ba003f";

async function refreshToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  return res.json();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const action    = searchParams.get("action");
  const optionIdx = parseInt(searchParams.get("option") || "0");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: request } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    return NextResponse.redirect(new URL("/admin/citas?error=not_found", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  if (action === "accept") {
    const options         = request.client_options as { date: string; time: string }[];
    const confirmedOption = options[optionIdx];
    if (!confirmedOption) {
      return NextResponse.redirect(new URL("/admin/citas?error=invalid_option", process.env.NEXT_PUBLIC_SITE_URL!));
    }
    await confirmRequest(supabase, request, confirmedOption);
    return NextResponse.redirect(new URL("/admin/citas?confirmed=1", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  return NextResponse.redirect(new URL("/admin/citas", process.env.NEXT_PUBLIC_SITE_URL!));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { action, option_index, agent_options, agent_message } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: request } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (action === "accept") {
    const options         = request.client_options as { date: string; time: string }[];
    const confirmedOption = options[option_index ?? 0];
    await confirmRequest(supabase, request, confirmedOption);
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (action === "reject") {
    await supabase.from("appointment_requests").update({
      status:        "rescheduled",
      agent_options: agent_options || [],
      agent_message: agent_message || null,
      updated_at:    new Date().toISOString(),
    }).eq("id", params.id);

    if (request.client_email && agent_options?.length) {
      const agentId = request.agent_id || FALLBACK_AGENT_ID;
      const { data: agent } = await supabase
        .from("profiles").select("full_name").eq("id", agentId).single();

      const { html, subject } = emailClienteNuevasOpciones({
        clientName:    request.client_name,
        agentName:     agent?.full_name || "Tu asesor",
        propertyTitle: request.property_title || "la propiedad",
        agentOptions:  agent_options,
        clientToken:   request.client_token,
        agentMessage:  agent_message,
      });
      await sendEmail({ to: request.client_email, subject, html });
    }

    return NextResponse.json({ ok: true, status: "rescheduled" });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

async function confirmRequest(
  supabase: any,
  request: any,
  confirmedOption: { date: string; time: string }
) {
  console.log("[DEBUG] confirmRequest iniciado");
  console.log("[DEBUG] agent_id:", request.agent_id);

  const starts_at = new Date(`${confirmedOption.date}T${confirmedOption.time}:00-06:00`).toISOString();
  const ends_at   = new Date(new Date(starts_at).getTime() + 60 * 60_000).toISOString();

  let googleEventId: string | null = null;
  const agentId = request.agent_id || FALLBACK_AGENT_ID;

  console.log("[DEBUG] agentId final:", agentId);

  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("profile_id", agentId)
    .single();

  console.log("[GCal] Token encontrado:", !!tokenRow);

  if (tokenRow) {
    let accessToken = tokenRow.access_token;
    if (Date.now() > tokenRow.expiry - 60_000) {
      console.log("[GCal] Refrescando token...");
      const refreshed = await refreshToken(tokenRow.refresh_token);
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        await supabase.from("google_calendar_tokens").update({
          access_token: refreshed.access_token,
          expiry:       Date.now() + refreshed.expires_in * 1000,
          updated_at:   new Date().toISOString(),
        }).eq("profile_id", agentId);
      }
    }

    const { data: agentProfile } = await supabase
      .from("profiles").select("email, full_name").eq("id", agentId).single();

    console.log("[GCal] Agent profile:", agentProfile?.email);

    const attendees = [];
    if (agentProfile?.email)  attendees.push({ email: agentProfile.email, displayName: agentProfile.full_name });
    if (request.client_email) attendees.push({ email: request.client_email, displayName: request.client_name });

    const event = {
      summary:     `Visita: ${request.property_title || "Propiedad Duclaud"}`,
      description: `Cliente: ${request.client_name}\nTeléfono: ${request.client_phone}${request.client_email ? `\nEmail: ${request.client_email}` : ""}\n\nAgendado desde duclaud.com.mx`,
      start:       { dateTime: starts_at, timeZone: "America/Merida" },
      end:         { dateTime: ends_at,   timeZone: "America/Merida" },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "email", minutes: 60   },
          { method: "popup", minutes: 30   },
        ],
      },
    };

    const calendarId = tokenRow.calendar_id || "primary";
    console.log("[GCal] Creando evento en calendario:", calendarId);

    const gcRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );
    const gcData = await gcRes.json();
    googleEventId = gcData.id || null;
    console.log("[GCal] Resultado:", gcData.id ? "OK id=" + gcData.id : "ERROR", JSON.stringify(gcData.error || ""));
  } else {
    console.error("[GCal] No hay token para agentId:", agentId);
  }

  await supabase.from("appointment_requests").update({
    status:           "confirmed",
    confirmed_option: confirmedOption,
    google_event_id:  googleEventId,
    updated_at:       new Date().toISOString(),
  }).eq("id", request.id);

  if (request.client_email) {
    const { data: agent } = await supabase
      .from("profiles").select("full_name, phone").eq("id", agentId).single();

    const { html, subject } = emailClienteConfirmado({
      clientName:    request.client_name,
      agentName:     agent?.full_name || "Tu asesor",
      agentPhone:    agent?.phone,
      propertyTitle: request.property_title || "la propiedad",
      confirmed:     confirmedOption,
    });
    await sendEmail({ to: request.client_email, subject, html });
  }
}

