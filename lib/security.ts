// lib/security.ts
// Utilidades de seguridad compartidas por las rutas API.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

// Escapa texto para insertarlo en HTML (emails) o XML (feed).
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

export const escapeXml = escapeHtml;

// Texto dentro de <![CDATA[ ]]>: la secuencia "]]>" cerraría el bloque antes de tiempo.
export function cdata(value: unknown): string {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// ── Rate limiting ──────────────────────────────────────────────────────────
// Si están UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN, el límite es global
// (compartido entre todas las instancias de Vercel). Si no, se usa memoria local:
// cada instancia serverless tiene la suya, así que solo frena abuso casual.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLocal(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimitLocal(key, limit, windowMs);

  try {
    // INCR + PEXPIRE NX en una sola ida: la ventana empieza con la primera petición
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", `rl:${key}`], ["PEXPIRE", `rl:${key}`, String(windowMs), "NX"]]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const [incr] = await res.json();
    return Number(incr?.result) <= limit;
  } catch (e) {
    // Si Redis falla, no tumbar el sitio: usar el límite local
    console.error("[rateLimit]", e instanceof Error ? e.message : e);
    return rateLimitLocal(key, limit, windowMs);
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}
