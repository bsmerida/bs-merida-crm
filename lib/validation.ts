// lib/validation.ts
// Validaciones de entrada para formularios públicos y chat.

export type SlotOption = { date: string; time: string };

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return false;
  if (/^(\d)\1{9,}$/.test(digits)) return false;
  return true;
}

const FAKE_DOMAINS = ["test.com", "example.com", "fake.com", "asdf.com"];

export function validateEmail(email: string): boolean {
  if (!email) return true; // opcional
  if (email.length > 254) return false;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !FAKE_DOMAINS.includes(domain);
}

export function validateName(name: string): boolean {
  const n = name.trim();
  return n.length >= 3 && n.length <= 120 && /\s/.test(n);
}

export function validateOptions(options: unknown, max = 3): options is SlotOption[] {
  if (!Array.isArray(options) || options.length === 0 || options.length > max) return false;
  return options.every(o =>
    o && typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    !isNaN(new Date(`${o.date}T00:00:00Z`).getTime()) &&
    typeof o.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.time)
  );
}

// ── Mensajes de chat (Sofía / asistente) ────────────────────────────────────
export type ChatMessage = { role: "user" | "assistant"; content: string };

// Normaliza el historial que manda el navegador: solo roles user/assistant,
// texto plano acotado, y empezando por un mensaje del usuario (requisito de la API).
export function sanitizeChatMessages(
  input: unknown,
  { maxMessages = 20, maxChars = 2000 } = {},
): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const msgs: ChatMessage[] = [];
  for (const m of input.slice(-maxMessages)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string" || !m.content.trim()) return null;
    msgs.push({ role: m.role, content: m.content.slice(0, maxChars) });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

// ── Filtros de búsqueda generados por la IA (Sofía) ─────────────────────────
// Salen de lo que escribe el cliente, así que se limpian antes de meterlos en
// la consulta: ",()" alteran los filtros .or() de PostgREST y "%_*\" son
// comodines de ilike.
export function cleanFilterText(v: unknown, max = 60): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[,()%_*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
}

export function cleanFilterNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
