import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyCard } from "@/components/PropertyCard";
import { Icon } from "@/components/Icon";

export default async function HomePage() {
  const supabase = createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*, property_images(url, position, is_cover)")
    .eq("is_published", true)
    .eq("status", "Disponible")
    .order("featured", { ascending: false })
    .limit(6);

  return (
    <>
      <PublicHeader />

      <section className="hero-gradient relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-8 pt-28 pb-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur border border-brand-100 text-brand-700 text-xs font-medium px-4 py-1.5 rounded-full mb-8 shadow-card">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            Asesoría inmobiliaria certificada AMPI
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold text-ink tracking-tight leading-[1.02]">
            Sabemos proteger<br />
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">tus intereses.</span>
          </h1>
          <p className="text-lg md:text-xl text-ink-muted mt-8 max-w-2xl mx-auto leading-relaxed">
            Acompañamiento integral con enfoque inmobiliario, legal y financiero. Operamos en Yucatán, Quintana Roo y Nuevo León.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/comprar" className="bg-brand-500 text-white px-8 py-3.5 rounded-full font-medium hover:bg-brand-600 shadow-float transition">Ver propiedades en venta</Link>
            <Link href="/rentar" className="bg-white border border-brand-100 text-ink px-8 py-3.5 rounded-full font-medium hover:border-brand-300 hover:bg-brand-50 transition">Ver en renta</Link>
          </div>
        </div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-warm-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Selección destacada</div>
            <h2 className="text-3xl font-semibold text-ink tracking-tight mt-2">Propiedades disponibles</h2>
          </div>
          <Link href="/comprar" className="text-sm text-brand-600 hover:text-brand-700 font-medium hidden md:flex items-center gap-1">
            Ver todas <Icon name="arrowRight" className="w-4 h-4" />
          </Link>
        </div>
        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(properties as any[]).map(p => {
              const cover = p.property_images?.find((i: any) => i.is_cover)?.url
                || p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url
                || null;
              return <PropertyCard key={p.id} p={p} coverUrl={cover} />;
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-ink-muted">
            <p className="text-sm">Aún no hay propiedades publicadas. El equipo está cargando el inventario.</p>
            <p className="text-xs mt-2">Si eres del equipo, <Link href="/login" className="text-brand-600 hover:underline">inicia sesión</Link> para agregar tu primera propiedad.</p>
          </div>
        )}
      </section>

      <section className="py-24 bg-gradient-to-b from-white to-ink-ghost">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Por qué BS Mérida</div>
            <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight mt-3">Aliados estratégicos, no simples vendedores.</h2>
            <p className="text-base text-ink-muted mt-4 max-w-xl mx-auto">Cuidamos cada operación como si fuera nuestra. Nuestro enfoque integra lo inmobiliario, legal y financiero.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { t: "Asesores certificados", d: "Equipo con certificación AMPI y conocimiento profundo del mercado.", icon: "users" },
              { t: "Acompañamiento 24/7", d: "Asistente IA y asesores humanos atentos cuando los necesitas.", icon: "chat" },
              { t: "Propiedades verificadas", d: "Cada inmueble es revisado en sitio antes de publicarse.", icon: "check" },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-3xl border border-brand-100 p-8 hover:shadow-float hover:border-brand-200 transition">
                <div className="w-12 h-12 rounded-2xl warm-gradient text-white flex items-center justify-center mb-6 shadow-card">
                  <Icon name={f.icon} className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-ink tracking-tight">{f.t}</h3>
                <p className="text-sm text-ink-muted mt-3 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-8 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">Hablemos directamente.</h2>
        <p className="text-lg text-ink-muted mt-5 max-w-xl mx-auto leading-relaxed">¿Tienes una propiedad para vender o rentar? ¿Buscas algo específico? Contáctanos por el medio que prefieras.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3.5 rounded-full font-medium">
            <Icon name="chat" className="w-4 h-4" /> WhatsApp {process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 746 6272"}
          </a>
          <a href={`tel:${(process.env.NEXT_PUBLIC_BUSINESS_PHONE || "9993034815").replace(/\s/g, "")}`} className="flex items-center gap-2 bg-white border border-ink-line hover:border-ink-soft text-ink px-6 py-3.5 rounded-full font-medium">
            <Icon name="bell" className="w-4 h-4" /> {process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815"}
          </a>
          <a href={`mailto:${process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com"}`} className="flex items-center gap-2 bg-white border border-ink-line hover:border-ink-soft text-ink px-6 py-3.5 rounded-full font-medium">
            <Icon name="send" className="w-4 h-4" /> {process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com"}
          </a>
        </div>
        <p className="text-xs text-ink-muted mt-6">Respondemos en menos de 30 minutos en horario hábil.</p>
      </section>

      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
