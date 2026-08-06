// app/api/finanzas-ai/route.ts
// Asistente con memoria persistente
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_HISTORY = 20; // mensajes a recordar por sesión

export async function POST(req: NextRequest) {
  const supabase  = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { messages, system } = await req.json();

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── Cargar memoria del usuario ─────────────────────────────────────────────
  let memoryContext = "";
  let historyMessages: { role: string; content: string }[] = [];

  if (user) {
    // Resumen de conversaciones anteriores
    const { data: memory } = await admin
      .from("ai_memory")
      .select("summary")
      .eq("profile_id", user.id)
      .single();

    if (memory?.summary) {
      memoryContext = `\n\nMEMORIA DE CONVERSACIONES ANTERIORES:\n${memory.summary}`;
    }

    // Historial reciente de esta sesión
    const { data: history } = await admin
      .from("ai_conversations")
      .select("role, content")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);

    historyMessages = (history || []).reverse();
  }

  // ── Llamar a Claude ────────────────────────────────────────────────────────
  const systemPrompt = (system || "") + memoryContext;

  // Combinar historial con mensajes actuales (evitar duplicados)
  const lastUserMsg = messages[messages.length - 1];
  const combinedMessages = [
    ...historyMessages.slice(0, -messages.length + 1),
    ...messages,
  ].slice(-MAX_HISTORY);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   combinedMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  const data = await response.json();
  const reply = data.content?.[0]?.text || "No pude generar una respuesta.";

  // ── Guardar en memoria ─────────────────────────────────────────────────────
  if (user) {
    // Guardar mensaje del usuario y respuesta
    await admin.from("ai_conversations").insert([
      { profile_id: user.id, role: "user",      content: lastUserMsg.content },
      { profile_id: user.id, role: "assistant", content: reply               },
    ]);

    // Cada 10 mensajes, actualizar el resumen de memoria
    const { count } = await admin
      .from("ai_conversations")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id);

    if (count && count % 10 === 0) {
      // Generar resumen de las últimas conversaciones
      const { data: recentConvs } = await admin
        .from("ai_conversations")
        .select("role, content")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const summaryResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key":         process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type":      "application/json",
        },
        body: JSON.stringify({
          model:      "claude-haiku-4-5",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Resume en 3-5 puntos clave las preferencias, patrones y contexto importante de este usuario basado en sus conversaciones con el asistente:\n\n${(recentConvs || []).reverse().map(m => `${m.role}: ${m.content}`).join("\n")}`,
          }],
        }),
      });

      const summaryData = await summaryResponse.json();
      const summary     = summaryData.content?.[0]?.text || "";

      await admin.from("ai_memory").upsert({
        profile_id: user.id,
        summary,
        updated_at: new Date().toISOString(),
      }, { onConflict: "profile_id" });
    }
  }

  return NextResponse.json({ reply });
}
