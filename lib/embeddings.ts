// lib/embeddings.ts
// Embeddings de texto vía Voyage AI — el socio de embeddings que recomienda
// Anthropic (Claude no tiene API propia de esto). Mientras no haya
// VOYAGE_API_KEY configurada, generarEmbedding() no hace nada: mismo patrón
// que sendPush()/enviarWhatsapp() con sus llaves — en cuanto se configure,
// la búsqueda semántica de Sofía arranca sola, sin tocar código.
export const EMBEDDING_DIMS = 1024; // debe coincidir con vector(1024) en la migración

const MODELO = process.env.VOYAGE_EMBED_MODEL || "voyage-3.5";

type TipoEntrada = "document" | "query"; // "document": se guarda en una propiedad; "query": lo que escribe el cliente

export async function generarEmbedding(texto: string, tipo: TipoEntrada = "document"): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  const limpio = texto.trim();
  if (!apiKey || !limpio) return null;

  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: limpio.slice(0, 8000), model: MODELO, input_type: tipo }),
    });
    if (!res.ok) {
      console.error("[Voyage]", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const vector = data?.data?.[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch (e) {
    console.error("[Voyage]", (e as Error)?.message);
    return null;
  }
}

// Texto que se guarda como embedding de una propiedad: descripción + amenidades,
// lo único con lenguaje libre (zona/precio/tipo ya se filtran exacto en SQL).
export function textoParaEmbedding(p: { description?: string | null; amenities?: string[] | null }): string {
  const amenidades = Array.isArray(p.amenities) && p.amenities.length ? `Amenidades: ${p.amenities.join(", ")}.` : "";
  return [p.description?.trim(), amenidades].filter(Boolean).join(" ");
}
