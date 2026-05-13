import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export default async function TableroPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, lead:leads(name, phone), agent:profiles(full_name, phone)")
    .eq("slug", params.slug)
    .single();

  if (!board) notFound();

  const { data: boardProps } = await supabase
    .from("board_properties")
    .select("ai_reason, ai_score, added_by, property:properties(id,title,type,operation,price,currency,zone,city,state,bedrooms,bathrooms,m2_construction,m2_land,parking,status)")
    .eq("board_id", board.id)
    .order("ai_score", { ascending: false });

  // Cargar imagen de portada de cada propiedad
  const propsWithCovers = await Promise.all(
    (boardProps || []).map(async (row: any) => {
      const { data: imgs } = await supabase
        .from("property_images")
        .select("url")
        .eq("property_id", row.property.id)
        .eq("is_cover", true)
        .limit(1);
      return { ...row.property, ai_reason: row.ai_reason, ai_score: row.ai_score, added_by: row.added_by, cover: imgs?.[0]?.url };
    })
  );

  const biz = {
    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "BS Mérida Inmobiliaria",
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815",
    whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272",
    web: process.env.NEXT_PUBLIC_BUSINESS_WEB || "bsmerida.com",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50/30">
      {/* Header */}
      <header className="bg-white border-b border-ink-line sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-brand-700 font-bold text-lg tracking-tight">BS | INMOBILIARIA</div>
          <a href={`https://wa.me/${biz.whatsapp}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium">
            📲 Contactar asesor
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Hero personalizado */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-100">
            ✨ Selección personalizada
          </div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">
            Hola, {board.lead?.name?.split(" ")[0] || "bienvenido"} 👋
          </h1>
          <p className="text-ink-muted max-w-lg mx-auto">
            {board.agent?.full_name
              ? `Tu asesor ${board.agent.full_name} preparó esta selección especialmente para ti`
              : "Tu asesor preparó estas propiedades especialmente para ti"}
            . Explora cada opción y cuéntanos cuál te interesa.
          </p>
          {board.agent?.phone && (
            <a href={`https://wa.me/${board.agent.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline mt-1">
              💬 Escribir a {board.agent.full_name}
            </a>
          )}
        </div>

        {/* Stats rápidas */}
        <div className="flex items-center justify-center gap-6 flex-wrap text-center">
          <div>
            <div className="text-2xl font-bold text-ink">{propsWithCovers.length}</div>
            <div className="text-xs text-ink-muted">opciones seleccionadas</div>
          </div>
          <div className="w-px h-8 bg-ink-line"></div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {fmt(Math.min(...propsWithCovers.map(p => p.price)))}
            </div>
            <div className="text-xs text-ink-muted">precio más bajo</div>
          </div>
          <div className="w-px h-8 bg-ink-line"></div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {fmt(Math.max(...propsWithCovers.map(p => p.price)))}
            </div>
            <div className="text-xs text-ink-muted">precio más alto</div>
          </div>
        </div>

        {/* Grid de propiedades */}
        {propsWithCovers.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">Tu asesor está preparando tu selección. ¡Vuelve pronto!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {propsWithCovers.map((p: any) => (
              <Link key={p.id} href={`/propiedad/${p.id}`}
                className="bg-white rounded-2xl border border-ink-line shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group">
                {/* Foto */}
                <div className="relative">
                  {p.cover ? (
                    <img src={p.cover} alt={p.title} className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-52 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-5xl">🏠</div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.operation === "Venta" ? "bg-brand-500 text-white" : "bg-emerald-500 text-white"}`}>
                      {p.operation}
                    </span>
                    {p.added_by === "ai" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-white/90 text-brand-700 backdrop-blur-sm">
                        ✨ {p.ai_score}/10
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 space-y-3">
                  <div>
                    <p className="font-semibold text-ink">{p.title}</p>
                    <p className="text-ink-muted text-sm">{[p.zone, p.city].filter(Boolean).join(", ")}</p>
                  </div>

                  <p className="text-brand-600 font-bold text-xl">
                    {fmt(p.price, p.currency)}
                    {p.operation === "Renta" && <span className="text-sm font-normal text-ink-muted"> /mes</span>}
                  </p>

                  {/* Specs */}
                  <div className="flex items-center gap-3 text-xs text-ink-muted pt-1 border-t border-ink-ghost">
                    {p.bedrooms > 0 && <span>🛏 {p.bedrooms} rec</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms} ba</span>}
                    {p.m2_construction && <span>📐 {p.m2_construction} m²</span>}
                    {p.parking > 0 && <span>🚗 {p.parking}</span>}
                  </div>

                  {/* Razón de la IA */}
                  {p.ai_reason && (
                    <p className="text-xs text-brand-600 bg-brand-50 rounded-xl px-3 py-2 leading-relaxed">
                      ✨ {p.ai_reason}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA final */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-8 text-center text-white space-y-4">
          <h2 className="text-xl font-semibold">¿Alguna te llamó la atención?</h2>
          <p className="text-white/70">Escríbenos y agendamos una visita a la que más te guste.</p>
          <a href={`https://wa.me/${biz.whatsapp}?text=${encodeURIComponent(`Hola! Vi el tablero de propiedades que me compartieron y me interesa agendar una visita.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-700 hover:bg-brand-50 rounded-full font-semibold text-sm">
            📲 Escribirnos por WhatsApp
          </a>
        </div>

        <footer className="text-center text-xs text-ink-muted pt-4 border-t border-ink-ghost">
          {biz.name} · {biz.phone} · {biz.web}
        </footer>
      </main>
    </div>
  );
}
