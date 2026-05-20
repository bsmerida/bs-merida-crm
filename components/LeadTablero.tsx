"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

type Prop = {
  id: string; title: string; type: string; operation: string;
  price: number; currency?: string; zone: string | null; city: string;
  bedrooms: number; bathrooms: number; m2_construction: number | null;
  status: string; cover?: string;
};
type BoardProp = Prop & { ai_reason?: string; ai_score?: number; added_by?: string };
type Board = { id: string; slug: string; title: string };

export function LeadTablero({ lead }: { lead: any }) {
  const supabase = createClient();
  const [board, setBoard] = useState<Board | null>(null);
  const [boardProps, setBoardProps] = useState<BoardProp[]>([]);
  const [allProps, setAllProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const boardIds = new Set(boardProps.map(p => p.id));
  const boardUrl = board ? `${typeof window !== "undefined" ? window.location.origin : ""}/tablero/${board.slug}` : "";

  // ── Carga inicial ──────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    setLoading(true);
    const supabaseClient = createClient();

    // Tablero del lead
    const { data: b } = await supabaseClient.from("boards").select("*").eq("lead_id", lead.id).maybeSingle();

    if (b) {
      setBoard(b);
      const { data: bp } = await supabaseClient
        .from("board_properties")
        .select("*, property:properties(id,title,type,operation,price,currency,zone,city,bedrooms,bathrooms,m2_construction,status)")
        .eq("board_id", b.id)
        .order("ai_score", { ascending: false });

      const bpIds = (bp || []).map((row: any) => row.property.id);
      const { data: bpCovers } = bpIds.length
        ? await supabaseClient.from("property_images").select("property_id, url").in("property_id", bpIds).eq("is_cover", true)
        : { data: [] };
      const bpCoverMap = Object.fromEntries((bpCovers || []).map((c: any) => [c.property_id, c.url]));

      setBoardProps((bp || []).map((row: any) => ({
        ...row.property,
        ai_reason: row.ai_reason,
        ai_score: row.ai_score,
        added_by: row.added_by,
        cover: bpCoverMap[row.property.id],
      })));
    }

    // Inventario disponible — una sola query para portadas
    const { data: props } = await supabaseClient
      .from("properties")
      .select("id,title,type,operation,price,currency,zone,city,bedrooms,bathrooms,m2_construction,status")
      .eq("status", "Disponible")
      .order("created_at", { ascending: false });

    const propIds = (props || []).map((p: any) => p.id);
    const { data: covers } = propIds.length
      ? await supabaseClient
          .from("property_images")
          .select("property_id, url")
          .in("property_id", propIds)
          .eq("is_cover", true)
      : { data: [] };

    const coverMap = Object.fromEntries((covers || []).map((c: any) => [c.property_id, c.url]));
    setAllProps((props || []).map((p: any) => ({ ...p, cover: coverMap[p.id] })));
    setLoading(false);
  }, [lead.id]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── Crear tablero ──────────────────────────────────────────
  const createBoard = async () => {
    setCreating(true);
    const res = await fetch("/api/tablero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, title: `Propiedades para ${lead.name}` }),
    });
    const { board: b } = await res.json();
    setBoard(b);
    setCreating(false);
  };

  // ── Matching IA ────────────────────────────────────────────
  const runAI = async () => {
    if (!board) return;

    // Verificar criterios mínimos antes de llamar
    const prefs = lead.preferences || {};
    const hasZones = prefs.zones?.length > 0;
    const hasBudget = lead.budget_max || lead.budget_min;
    const hasTypes = lead.search_types?.length > 0 || prefs.types?.length > 0;

    if (!hasBudget && !hasZones) {
      alert("Para mejores resultados, completa al menos:\n• El presupuesto máximo del cliente\n• Las zonas de interés\n\nGuarda el perfil del cliente y vuelve a intentar.");
      return;
    }

    setMatching(true);
    const res = await fetch("/api/tablero/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead }),
    });
    const json = await res.json();
    const { matches, error, empty, no_criteria } = json;

    if (no_criteria) {
      alert("Completa el presupuesto máximo o las zonas de interés en el perfil del cliente y guarda antes de usar la IA.");
      setMatching(false);
      return;
    }
    if (error && !empty) { alert(`Error IA: ${error}`); setMatching(false); return; }
    if (empty || !matches?.length) {
      const d = json.debug;
      const msg = d
        ? `Sin resultados.\n\nDebug:\n• Total props disponibles: ${d.total_props}\n• Tras presupuesto: ${d.after_budget}\n• Tras operación (${d.operation || "sin filtro"}): ${d.after_operation}\n• Tras tipo (${d.types?.join(",") || "sin filtro"}): ${d.after_types}\n• Zonas configuradas: ${d.zones_count}\n\nValores en DB:\nOperaciones: ${d.sample_operations?.join(", ")}\nTipos: ${d.sample_types?.join(", ")}`
        : "Sin resultados. Revisa zona, presupuesto o tipo.";
      alert(msg);
      setMatching(false);
      return;
    }

    // Agregar cada match al tablero
    for (const m of (matches || [])) {
      await fetch(`/api/tablero/${board.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: m.property_id, ai_reason: m.reason, ai_score: m.score, added_by: "ai" }),
      });
    }
    setAiDone(true);
    setMatching(false);
    loadBoard();
  };

  // ── Agregar / quitar propiedad ─────────────────────────────
  const addProp = async (prop: Prop) => {
    if (!board) return;
    await fetch(`/api/tablero/${board.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: prop.id, added_by: "agent" }),
    });
    const { data: img } = await supabase.from("property_images").select("url").eq("property_id", prop.id).eq("is_cover", true).limit(1).single();
    setBoardProps(prev => [...prev, { ...prop, cover: img?.url }]);
  };

  const removeProp = async (propId: string) => {
    if (!board) return;
    await fetch(`/api/tablero/${board.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: propId }),
    });
    setBoardProps(prev => prev.filter(p => p.id !== propId));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = allProps.filter(p =>
    !boardIds.has(p.id) &&
    (search === "" || p.title.toLowerCase().includes(search.toLowerCase()) || (p.zone || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="py-10 text-center text-sm text-ink-muted">Cargando tablero...</div>;

  // ── Sin tablero ────────────────────────────────────────────
  if (!board) return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-10 text-center space-y-4">
      <div><svg className="w-12 h-12 text-stone-dk" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div>
      <h3 className="font-semibold text-ink text-lg">Crea un tablero para {lead.name}</h3>
      <p className="text-sm text-ink-muted max-w-md mx-auto">
        Un tablero es una selección personalizada de propiedades que le mandas al cliente por WhatsApp. La IA analiza su perfil y sugiere las mejores opciones automáticamente.
      </p>
      <button onClick={createBoard} disabled={creating}
        className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-medium text-sm disabled:opacity-50">
        {creating ? "Creando..." : "Crear tablero con IA"}
      </button>
    </div>
  );

  // ── Con tablero ────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header del tablero */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Tablero de propiedades</p>
            <h3 className="font-semibold text-xl">{board.title}</h3>
            <p className="text-white/60 text-sm mt-1">{boardProps.length} propiedad{boardProps.length !== 1 ? "es" : ""} seleccionada{boardProps.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm max-w-[280px]">
              <span className="truncate text-white/80 text-xs">{boardUrl}</span>
              <button onClick={copyLink} className="shrink-0 text-white hover:text-white/80">
                {copied ? "✓" : "📋"}
              </button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Hola ${lead.name}! Preparé estas propiedades especialmente para ti 🏠\n\n${boardUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full">
              📲 Enviar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        {!lead.budget_max && !(lead.preferences?.zones?.length) && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
            ⚠️ Para mejores sugerencias, completa el <strong>presupuesto máximo</strong> y las <strong>zonas de interés</strong> en el perfil del cliente y guarda.
          </div>
        )}
        <button onClick={runAI} disabled={matching}
          className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-full text-sm font-medium disabled:opacity-50">
          {matching ? (
            <><span className="animate-spin">⟳</span> Analizando con IA...</>
          ) : (
            <>{aiDone ? "Volver a analizar con IA" : "Sugerir propiedades con IA"}</>
          )}
        </button>
        <button onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-ink-line hover:border-ink-soft text-ink rounded-full text-sm">
          + Agregar manualmente
        </button>
        <a href={`/tablero/${board.slug}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-ink-line hover:border-ink-soft text-ink rounded-full text-sm">
          👁️ Ver como cliente
        </a>
      </div>

      {/* Propiedades en el tablero */}
      {boardProps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-ink-line p-10 text-center text-sm text-ink-muted">
          Aún no hay propiedades. Usa "Sugerir con IA" o agrega manualmente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardProps.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden group">
              <div className="relative">
                {p.cover ? (
                  <img src={p.cover} alt={p.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-4xl">🏠</div>
                )}
                {p.added_by === "ai" && (
                  <div className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    IA · {p.ai_score}/10
                  </div>
                )}
                <button onClick={() => removeProp(p.id)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  ✕
                </button>
              </div>
              <div className="p-4">
                <p className="font-medium text-ink text-sm truncate">{p.title}</p>
                <p className="text-brand-600 font-semibold text-base mt-0.5">{fmt(p.price, p.currency)}</p>
                <p className="text-ink-muted text-xs mt-1">{[p.zone, p.city].filter(Boolean).join(", ")}</p>
                {p.ai_reason && (
                  <p className="text-xs text-brand-600 bg-brand-50 rounded-lg px-2 py-1.5 mt-2">
                    {p.ai_reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picker de propiedades manuales */}
      {showPicker && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-ink">Agregar del inventario</h4>
            <button onClick={() => setShowPicker(false)} className="text-ink-muted hover:text-ink text-sm">Cerrar</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o zona..."
            className="w-full border border-ink-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-400" />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.slice(0, 30).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-ghost cursor-pointer" onClick={() => addProp(p)}>
                {p.cover ? (
                  <img src={p.cover} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center text-xl shrink-0">🏠</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{p.title}</p>
                  <p className="text-xs text-ink-muted">{fmt(p.price, p.currency)} · {[p.zone, p.city].filter(Boolean).join(", ")}</p>
                </div>
                <span className="text-brand-500 text-lg shrink-0">+</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-ink-muted text-center py-4">No hay propiedades disponibles que añadir.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
