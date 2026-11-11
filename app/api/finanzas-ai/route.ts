// app/api/finanzas-ai/route.ts
// Asistente con memoria persistente (solo personal autenticado).
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { sanitizeChatMessages, type ChatMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
const MAX_HISTORY = 20;          // mensajes a recordar
const MAX_SYSTEM_CHARS = 30_000; // el contexto lo arma el navegador con datos del CRM

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function textOf(msg: Anthropic.Message): string {
  return msg.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}

export async function POST(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;
  if (!await rateLimit(`finanzas-ai:${auth.userId}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas consultas, espera unos minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const incoming = sanitizeChatMessages(body?.messages, { maxMessages: MAX_HISTORY, maxChars: 4000 });
  if (!incoming) return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 });
  const system = typeof body.system === "string" ? body.system.slice(0, MAX_SYSTEM_CHARS) : "";
  const lastUserMsg = incoming[incoming.length - 1];

  const db = createAdminClient();
  const [{ data: memory }, { data: history }] = await Promise.all([
    db.from("ai_memory").select("summary").eq("profile_id", auth.userId).maybeSingle(),
    db.from("ai_conversations").select("role, content").eq("profile_id", auth.userId)
      .order("created_at", { ascending: false }).limit(MAX_HISTORY),
  ]);

  // El historial guardado ya incluye los turnos anteriores de esta sesión, así
  // que se combina con el último mensaje del usuario (antes se descartaba por un
  // slice(0, 0) y la memoria nunca llegaba al modelo).
  const stored = sanitizeChatMessages([...(history || []).reverse(), lastUserMsg], { maxMessages: MAX_HISTORY, maxChars: 4000 });
  const messages: ChatMessage[] = stored && stored.length > incoming.length ? stored : incoming;

  const memoryContext = memory?.summary ? `\n\nMEMORIA DE CONVERSACIONES ANTERIORES:\n${memory.summary}` : "";

  let reply: string;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: system + memoryContext,
      messages,
    });
    reply = textOf(response) || "No pude generar una respuesta.";
  } catch (e) {
    console.error("[finanzas-ai]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return NextResponse.json({ error: "El asistente no está disponible en este momento." }, { status: 502 });
  }

  await db.from("ai_conversations").insert([
    { profile_id: auth.userId, role: "user",      content: lastUserMsg.content },
    { profile_id: auth.userId, role: "assistant", content: reply },
  ]);

  // Cada 10 mensajes, actualizar el resumen de memoria
  const { count } = await db.from("ai_conversations")
    .select("*", { count: "exact", head: true }).eq("profile_id", auth.userId);

  if (count && count % 10 === 0) {
    const { data: recent } = await db.from("ai_conversations").select("role, content")
      .eq("profile_id", auth.userId).order("created_at", { ascending: false }).limit(20);
    try {
      const summary = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Resume en 3-5 puntos clave las preferencias, patrones y contexto importante de este usuario basado en sus conversaciones con el asistente:\n\n${(recent || []).reverse().map(m => `${m.role}: ${m.content}`).join("\n")}`,
        }],
      });
      await db.from("ai_memory").upsert({
        profile_id: auth.userId, summary: textOf(summary), updated_at: new Date().toISOString(),
      }, { onConflict: "profile_id" });
    } catch (e) {
      console.error("[finanzas-ai] resumen:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ reply });
}
