// lib/fuentes.ts
// Aprobación y rechazo de los borradores que propone el agente de fuentes.
// Aprobar una "Nueva" crea la propiedad SIN publicar; aprobar "Actualizar"
// cambia solo los campos aceptados. Nada se publica ni se despublica aquí.
import type { SupabaseClient } from "@supabase/supabase-js";
import { TIPOS_PROPIEDAD, OPERACIONES, ESTADOS_PROPIEDAD } from "@/lib/utils";
import { portalesValidos } from "@/lib/portales";

export const MOTIVOS_RECHAZO = ["Datos", "Fotos", "Texto", "Coincidencia", "Otro"] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number];

// Cada motivo enseña al especialista que cometió el error.
export const PASO_POR_MOTIVO: Record<MotivoRechazo, string> = {
  Datos: "extractor", Fotos: "fotos", Texto: "redactor", Coincidencia: "comparador", Otro: "general",
};

// Mismos campos que guarda el formulario de propiedades (lista blanca).
const TEXTO: Record<string, number> = { title: 160, description: 5000, address: 300, zone: 120, city: 120, state: 120, development: 200 };
const NUMERO = ["price", "bedrooms", "bathrooms", "m2_construction", "m2_land", "parking"];
export const CAMPOS_PROPIEDAD = [
  ...Object.keys(TEXTO), ...NUMERO, "type", "operation", "status", "price_type", "currency", "amenities",
];

export function limpiarDatos(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [campo, max] of Object.entries(TEXTO)) {
    if (!(campo in input)) continue;
    const v = input[campo];
    out[campo] = v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, max);
  }
  for (const campo of NUMERO) {
    if (!(campo in input)) continue;
    const n = Number(input[campo]);
    const nullable = campo === "m2_construction" || campo === "m2_land";
    out[campo] = Number.isFinite(n) && n > 0 ? n : nullable ? null : 0;
  }
  if ((TIPOS_PROPIEDAD as readonly string[]).includes(String(input.type))) out.type = input.type;
  if ((OPERACIONES as readonly string[]).includes(String(input.operation))) out.operation = input.operation;
  if ((ESTADOS_PROPIEDAD as readonly string[]).includes(String(input.status))) out.status = input.status;
  if (input.price_type === "total" || input.price_type === "m2" || input.price_type === "lineal") out.price_type = input.price_type;
  if (input.currency === "MXN" || input.currency === "USD") out.currency = input.currency;
  if ("amenities" in input) {
    const lista = Array.isArray(input.amenities) ? input.amenities : String(input.amenities ?? "").split(",");
    out.amenities = lista.map(a => String(a).trim().slice(0, 80)).filter(Boolean).slice(0, 40);
  }
  return out;
}

type Db = SupabaseClient<any, any, any>;
type Foto = { url: string; nombre?: string };
export type Borrador = {
  id: string; fuente_id: string; desarrollo_id: string | null; clave_modelo: string;
  accion: "Nueva" | "Actualizar"; property_id: string | null; estado: string;
  datos: Record<string, unknown>; cambios: Record<string, { antes: unknown; despues: unknown }> | null;
  fotos: Foto[];
};

export class ErrorBorrador extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// Misma referencia que genera el formulario: DLC-AAMM-NNN.
async function siguienteReferencia(db: Db) {
  const now = new Date();
  const ym = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { count } = await db.from("properties").select("*", { count: "exact", head: true }).like("reference", `DLC-${ym}-%`);
  return `DLC-${ym}-${String((count || 0) + 1).padStart(3, "0")}`;
}

// Solo se aceptan fotos que propuso el agente (no URLs arbitrarias).
function fotosElegidas(borrador: Borrador, urls: unknown): Foto[] {
  if (!Array.isArray(urls)) return borrador.fotos;
  const propuestas = new Map(borrador.fotos.map(f => [f.url, f]));
  return [...new Set(urls.map(String))].filter(u => propuestas.has(u)).map(u => propuestas.get(u)!);
}

// Marca el borrador como tomado; si otra persona ya lo revisó, falla con 409.
async function tomar(db: Db, id: string, cambios: Record<string, unknown>) {
  const { data } = await db.from("propiedad_borradores").update(cambios).eq("id", id).eq("estado", "Pendiente").select("id");
  if (!data?.length) throw new ErrorBorrador("Este borrador ya fue revisado.", 409);
}

export async function aprobarBorrador(
  db: Db, borrador: Borrador,
  entrada: {
    datos?: Record<string, unknown>; aceptados?: string[]; fotos?: unknown;
    // Lo elige la persona al aprobar una nueva; nunca se publica sin esto
    publicar?: { sitio?: unknown; portales?: unknown };
  },
  userId: string,
): Promise<{ propertyId: string; publicada: boolean }> {
  const revisado = { revisado_por: userId, revisado_en: new Date().toISOString() };
  const fotos = fotosElegidas(borrador, entrada.fotos);

  if (borrador.accion === "Nueva") {
    const final = limpiarDatos({ ...borrador.datos, ...(entrada.datos || {}) });
    if (!final.title) throw new ErrorBorrador("Falta el título.");
    if (!final.type) throw new ErrorBorrador("Falta el tipo de propiedad.");
    if (!final.price) throw new ErrorBorrador("Falta el precio.");
    // Los portales leen solo publicadas: sin "sitio" no se marca ningún portal
    const publicar = entrada.publicar?.sitio === true;
    if (publicar && !fotos.length) {
      throw new ErrorBorrador("Para publicarla necesita al menos una foto. Elige una o apruébala sin publicar.");
    }
    const portales = publicar ? portalesValidos(entrada.publicar?.portales) : [];

    await tomar(db, borrador.id, { estado: "Aprobado", ...revisado });
    const { data: prop, error } = await db.from("properties").insert({
      ...final, status: final.status || "Disponible", is_published: publicar, featured: false,
      ...Object.fromEntries(portales.map(p => [p, true])),
      reference: await siguienteReferencia(db),
    }).select("id").single();
    if (error || !prop) {
      // No se creó nada: el borrador vuelve a quedar pendiente.
      await db.from("propiedad_borradores").update({ estado: "Pendiente", revisado_por: null, revisado_en: null }).eq("id", borrador.id);
      throw new ErrorBorrador(`No se pudo crear la propiedad: ${error?.message || "sin respuesta"}`, 500);
    }
    // La propiedad ya existe: lo demás no revierte el borrador (evita duplicarla al reintentar).
    if (fotos.length) {
      await db.from("property_images").insert(fotos.map((f, i) => ({ property_id: prop.id, url: f.url, position: i, is_cover: i === 0 })));
    }
    await db.from("propiedad_fuentes").upsert({ property_id: prop.id, fuente_id: borrador.fuente_id, clave_modelo: borrador.clave_modelo });
    await db.from("propiedad_borradores").update({ property_id: prop.id, datos_finales: final, fotos }).eq("id", borrador.id);
    return { propertyId: prop.id, publicada: publicar };
  }

  // Actualizar: solo los campos propuestos que la persona dejó marcados.
  if (!borrador.property_id) throw new ErrorBorrador("La propiedad ya no existe en el inventario.", 410);
  const propuestos = borrador.cambios || {};
  const aceptados = (entrada.aceptados ?? Object.keys(propuestos)).filter(c => c in propuestos);
  const valores: Record<string, unknown> = {};
  for (const c of aceptados) valores[c] = entrada.datos && c in entrada.datos ? entrada.datos[c] : propuestos[c].despues;
  const final = limpiarDatos(valores);
  if (!Object.keys(final).length && !fotos.length) throw new ErrorBorrador("No marcaste ningún cambio. Si no aplica, recházalo.");

  await tomar(db, borrador.id, { estado: "Aprobado", ...revisado });
  if (Object.keys(final).length) {
    const { error } = await db.from("properties").update(final).eq("id", borrador.property_id);
    if (error) {
      await db.from("propiedad_borradores").update({ estado: "Pendiente", revisado_por: null, revisado_en: null }).eq("id", borrador.id);
      throw new ErrorBorrador(`No se pudo actualizar la propiedad: ${error.message}`, 500);
    }
  }
  if (fotos.length) {
    const { count } = await db.from("property_images").select("*", { count: "exact", head: true }).eq("property_id", borrador.property_id);
    const inicio = count || 0;
    await db.from("property_images").insert(fotos.map((f, i) => ({
      property_id: borrador.property_id, url: f.url, position: inicio + i, is_cover: inicio === 0 && i === 0,
    })));
  }
  await db.from("propiedad_fuentes").upsert({ property_id: borrador.property_id, fuente_id: borrador.fuente_id, clave_modelo: borrador.clave_modelo });
  await db.from("propiedad_borradores").update({ datos_finales: final, fotos }).eq("id", borrador.id);
  return { propertyId: borrador.property_id, publicada: false };
}

export async function rechazarBorrador(
  db: Db, borrador: Borrador,
  entrada: { motivo?: unknown; feedback?: unknown; rehacer?: unknown },
  userId: string,
) {
  const motivo = MOTIVOS_RECHAZO.includes(entrada.motivo as MotivoRechazo) ? (entrada.motivo as MotivoRechazo) : null;
  if (!motivo) throw new ErrorBorrador("Elige el motivo del rechazo.");
  const feedback = String(entrada.feedback ?? "").trim().slice(0, 1000);
  if (feedback.length < 5) throw new ErrorBorrador("Escribe qué estuvo mal: el agente lo usa para aprender.");

  await tomar(db, borrador.id, {
    estado: "Rechazado", motivo_rechazo: motivo, feedback, revisado_por: userId, revisado_en: new Date().toISOString(),
  });
  await db.from("agente_lecciones").insert({ paso: PASO_POR_MOTIVO[motivo], leccion: feedback, borrador_id: borrador.id, creado_por: userId });
  // "Volver a intentar": la próxima corrida vuelve a procesar ese desarrollo con la lección nueva.
  if (entrada.rehacer === true && borrador.desarrollo_id) {
    await db.from("fuente_desarrollos").update({ firma: null }).eq("id", borrador.desarrollo_id);
  }
}
