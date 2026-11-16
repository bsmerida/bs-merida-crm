import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROPERTY_COLUMNS, conPortada } from "@/lib/public-property";
import { PublicChatbot } from "@/components/PublicChatbot";
import { SearchBox } from "@/components/SearchBox";
import { SofiaTeaser } from "@/components/SofiaTeaser";
import { Icon } from "@/components/Icon";
import { NAV_V3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";

const fmtPrice = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export default async function HomePage() {
  const supabase = createClient();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const waLink = `https://wa.me/${wa}`;

  const [{ data: properties }, { data: zonesData }] = await Promise.all([
    supabase.from("properties").select(PUBLIC_PROPERTY_COLUMNS)
      .eq("is_published", true).eq("status", "Disponible")
      .order("featured", { ascending: false }).limit(3),
    supabase.from("properties").select("zone, city")
      .eq("is_published", true).eq("status", "Disponible"),
  ]);
  const zones = [...new Set((zonesData || []).flatMap((p: any) => [p.zone, p.city].filter(Boolean)))].sort() as string[];
  const destacadas = (properties || []).map(conPortada);

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      {/* Hero + Header */}
      <section className="rounded-[32px] md:rounded-[48px] px-5 md:px-12 pt-7 md:pt-9 pb-8 md:pb-14 relative overflow-hidden" style={{ backgroundImage: "linear-gradient(145deg, #2B3F68 0%, #1C2B4B 71%)" }}>
        <div className="flex items-center justify-between gap-3 md:gap-6 flex-wrap">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-white select-none min-w-0">
            <p className="font-serif text-2xl md:text-[34px] tracking-[1.36px] leading-none">D<span className="text-gold">.</span>UCLAUD</p>
            <p className="text-[9px] md:text-[10px] tracking-[3.4px] uppercase opacity-80">Bienes Raíces</p>
          </Link>
          <nav className="hidden lg:flex items-center gap-0.5 bg-white/[0.12] rounded-full p-1.5">
            {NAV_V3.map(n => (
              <Link key={n.href} href={n.href} className="px-5 py-2.5 rounded-full text-[15px] font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap">
                {n.l}
              </Link>
            ))}
          </nav>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="bg-white text-navy px-4 md:px-[26px] py-3 md:py-[14px] rounded-full text-sm md:text-[15px] font-semibold hover:bg-stone transition-colors whitespace-nowrap">
            Agendar consulta
          </a>
        </div>

        <div className="mt-10 md:mt-20 flex flex-col gap-5 md:gap-7">
          <h1 className="font-serif font-medium text-white text-5xl md:text-[132px] leading-[1.05] md:leading-[0.97] tracking-tight md:tracking-[-2.64px] max-w-[1100px] min-w-0">
            Inversiones que <em className="italic text-gold not-italic font-serif">trascienden</em>.
          </h1>
          <p className="text-white/80 text-lg md:text-[22px] max-w-[640px] min-w-0">
            Propiedades en Yucatán y Nuevo León.
          </p>
          <div className="mt-3 md:mt-5">
            <SearchBox zones={zones} />
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section className="pt-12 md:pt-[110px] pb-10 px-5 md:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { n: "600+", l: "propiedades gestionadas" },
            { n: "2",    l: "estados donde operamos" },
            { n: "100%", l: "con revisión legal" },
          ].map(s => (
            <div key={s.n} className="flex flex-col items-center gap-2.5">
              <p className="font-dmsans font-medium text-navy text-6xl md:text-[92px] tracking-tight md:tracking-[-2.76px]">{s.n}</p>
              <p className="text-[#6b7385] text-base md:text-[18px]">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ciudades */}
      <section className="px-5 md:px-8 py-12 md:py-[110px] flex flex-col items-center gap-8 md:gap-14">
        <h2 className="font-serif text-navy text-4xl md:text-[80px] md:leading-[80px] text-center min-w-0">Dos estados. Un solo estándar.</h2>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <Link href="/comprar?zone=Mérida" className="flex-1 h-[420px] md:h-[580px] rounded-[40px] p-9 flex flex-col justify-end text-white"
            style={{ backgroundImage: "linear-gradient(135deg, #2B3F68 0%, #1C2B4B 71%)" }}>
            <p className="font-serif text-4xl md:text-[48px] md:leading-[50px]">Mérida</p>
            <p className="text-white/75 mt-1.5 md:text-[16px]">Yucatán</p>
          </Link>
          <Link href="/comprar?zone=Monterrey" className="flex-1 h-[420px] md:h-[580px] rounded-[40px] p-9 flex flex-col justify-end text-white"
            style={{ backgroundImage: "linear-gradient(135deg, #22345A 0%, #1C2B4B 71%)" }}>
            <p className="font-serif text-4xl md:text-[48px] md:leading-[50px]">Nuevo León</p>
            <p className="text-white/75 mt-1.5 md:text-[16px]">Monterrey</p>
          </Link>
        </div>
      </section>

      {/* Propiedades destacadas */}
      <section className="px-5 md:px-8 py-12 md:py-[110px] flex flex-col items-center gap-8 md:gap-14">
        <div className="text-center">
          <h2 className="font-serif text-navy text-4xl md:text-[80px] md:leading-[80px] min-w-0">Lo mejor del inventario.</h2>
          <p className="text-[#6b7385] text-lg md:text-[20px] mt-3">Cada propiedad, con documentación revisada.</p>
        </div>
        {destacadas.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
              {(destacadas as any[]).map(p => (
                <Link key={p.id} href={`/propiedad/${p.id}`} className="bg-white rounded-[32px] p-3 flex flex-col gap-3.5 hover:shadow-float transition-shadow min-w-0">
                  <div className="h-[240px] md:h-[320px] rounded-[24px] relative overflow-hidden bg-navy flex items-start justify-between p-3.5">
                    {p.cover
                      ? <img src={p.cover} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(138deg, #2B3F68 0%, #1C2B4B 71%)" }} />}
                    <span className="relative bg-white text-navy text-[13px] font-semibold px-4 py-2 rounded-full">{p.operation}</span>
                    <span className="relative bg-white w-[42px] h-[42px] rounded-full flex items-center justify-center">
                      <Icon name="heart" className="w-[18px] h-[18px] text-navy" />
                    </span>
                  </div>
                  <div className="px-2 pb-2 flex flex-col gap-1.5 min-w-0">
                    <p className="font-semibold text-navy text-[28px] md:text-[31px] tracking-tight md:tracking-[-0.31px]">
                      {fmtPrice(Number(p.price), (p as any).currency)}{p.operation === "Renta" && <span className="text-base font-medium text-[#6b7385]"> / mes</span>}
                    </p>
                    <p className="font-medium text-navy text-lg truncate">{p.title}</p>
                    <p className="text-[#6b7385] text-[15px]">{[p.city, p.state].filter(Boolean).join(", ")}</p>
                    <div className="flex gap-1.5 pt-2 flex-wrap">
                      {p.bedrooms > 0 && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.bedrooms} rec</span>}
                      {p.bathrooms > 0 && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.bathrooms} baños</span>}
                      {p.m2_construction && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.m2_construction} m²</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/comprar" className="bg-navy hover:bg-navy-mid text-white font-semibold px-8 py-4 rounded-full transition-colors">
              Ver todo el inventario
            </Link>
          </>
        ) : (
          <div className="py-16 text-center text-[#6b7385]">Cargando inventario...</div>
        )}
      </section>

      {/* Mapa */}
      <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-20 py-10 md:py-24 flex flex-col md:flex-row gap-10 md:gap-16 items-center">
        <div className="flex-1 min-w-0 flex flex-col gap-6 text-white">
          <h2 className="font-serif text-3xl md:text-[68px] md:leading-[70px] leading-tight min-w-0">
            Encuentra tu zona, <em className="italic text-gold not-italic">no solo tu casa.</em>
          </h2>
          <p className="text-white/75 text-lg md:text-[19px] min-w-0">Explora el inventario en el mapa y filtra por precio.</p>
          <Link href="/mapa" className="self-start bg-white text-navy font-semibold px-8 py-4 rounded-full hover:bg-stone transition-colors mt-1">
            Abrir el mapa
          </Link>
        </div>
        <div className="bg-stone rounded-[32px] relative w-full md:w-[640px] h-[280px] md:h-[480px] overflow-hidden shrink-0">
          <div className="absolute top-[28%] -left-[5%] w-[115%] h-[14px] bg-white/80 rounded-full rotate-[10deg]" />
          <div className="absolute top-[-5%] left-[20%] w-[14px] h-[115%] bg-white/80 rounded-full -rotate-[14deg]" />
          <div className="absolute top-[-5%] left-[42%] w-[14px] h-[115%] bg-white/80 rounded-full rotate-[18deg]" />
          <span className="absolute top-[22%] left-[12%] bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full">$4.8M</span>
          <span className="absolute top-[52%] left-[62%] bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full">$2.8M</span>
          <span className="absolute top-[78%] left-[32%] bg-navy text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-white" />$12.5M
          </span>
          <span className="absolute top-[88%] left-[74%] bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full">$38K</span>
        </div>
      </section>

      {/* Todo sobre la mesa */}
      <section className="rounded-[32px] md:rounded-[48px] bg-stone px-6 md:px-16 py-14 md:py-[130px] flex flex-col items-center gap-10 md:gap-16">
        <div className="text-center">
          <h2 className="font-serif text-navy text-4xl md:text-[112px] md:leading-[108px] min-w-0">Todo sobre la <em className="italic not-italic font-serif text-navy">mesa</em>.</h2>
          <p className="text-[#6b7385] text-xl md:text-[22px] mt-4">Costos, plazos y riesgos, antes de que firmes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 w-full">
          {[
            { n: "01", t: "Equipo legal interno",    d: "Revisamos contratos y documentos antes de que firmes." },
            { n: "02", t: "Análisis financiero",      d: "Rendimiento, costos y escenarios con números verificables." },
            { n: "03", t: "Sin letra chica",          d: "Honorarios, impuestos y gastos de cierre claros desde el inicio." },
            { n: "04", t: "Inventario verificado",    d: "Cada propiedad con documentación revisada y datos confirmados." },
          ].map(v => (
            <div key={v.n} className="flex flex-col gap-3">
              <p className="text-gold font-medium text-2xl md:text-[28px] md:tracking-[-0.28px]">{v.n}</p>
              <p className="font-semibold text-navy text-lg md:text-[21px]">{v.t}</p>
              <p className="text-[#6b7385] text-[15px] md:text-[16px] leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sofía */}
      <SofiaTeaser>
        <section className="px-5 md:px-8 py-14 md:py-[120px] flex flex-col items-center gap-8 md:gap-12">
          <div className="text-center">
            <h2 className="font-serif text-navy text-4xl md:text-[80px] md:leading-[80px] min-w-0">Cuéntale lo que <em className="italic not-italic font-serif">buscas.</em></h2>
            <p className="text-[#6b7385] text-lg md:text-[20px] mt-3">Sofía filtra el inventario real de Duclaud por ti.</p>
          </div>
          <div className="bg-white rounded-[32px] p-6 w-full max-w-[680px] flex flex-col gap-3.5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-[46px] h-[46px] rounded-full bg-navy flex items-center justify-center shrink-0">
                <span className="font-serif text-xl text-white">S</span>
              </div>
              <div>
                <p className="font-semibold text-navy text-[15px]">Sofía</p>
                <p className="text-[#6b7385] text-[13px]">Asistente de Duclaud · en línea</p>
              </div>
            </div>
            <div className="flex justify-end">
              <p className="bg-navy text-white text-[15px] leading-relaxed px-5 py-3.5 rounded-[20px] max-w-[85%]">
                Busco una propiedad en Mérida Norte, hasta 5 millones.
              </p>
            </div>
            <p className="bg-stone text-navy text-[15px] leading-relaxed px-5 py-3.5 rounded-[20px] max-w-[85%]">
              Encontré 12 propiedades en ese rango. ¿Prefieres alberca o más de 3 recámaras?
            </p>
            <div className="bg-stone rounded-full flex items-center justify-between pl-5 pr-1.5 py-1.5 mt-1">
              <span className="text-[#6b7385] text-sm">Escribe tu mensaje…</span>
              <span className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white">→</span>
            </div>
          </div>
        </section>
      </SofiaTeaser>

      {/* Quién está detrás */}
      <section className="px-5 md:px-8 py-14 md:pt-[100px] md:pb-[120px] flex flex-col md:flex-row gap-8 md:gap-[72px] items-center">
        <div className="w-full md:w-[560px] h-[280px] md:h-[700px] rounded-[28px] md:rounded-[40px] shrink-0 flex items-center justify-center"
          style={{ backgroundImage: "linear-gradient(128deg, #2B3F68 0%, #1C2B4B 71%)" }}>
          <p className="text-white/55 text-[13px] tracking-[1.04px] uppercase">Foto de Bertha Duclaud</p>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <p className="text-gold text-xs font-semibold tracking-[2.64px]">QUIÉN ESTÁ DETRÁS</p>
          <h2 className="font-serif text-navy text-3xl md:text-[64px] md:leading-[66px] leading-tight min-w-0">
            Cada inversión es la decisión de <em className="italic not-italic font-serif">una familia.</em>
          </h2>
          <div>
            <p className="font-semibold text-navy text-lg md:text-[19px]">Bertha Duclaud</p>
            <p className="text-[#6b7385] md:text-[16px]">Fundadora · Socia AMPI</p>
          </div>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="self-start bg-navy hover:bg-navy-mid text-white font-semibold px-8 py-4 rounded-full transition-colors mt-1">
            Agendar una llamada
          </a>
        </div>
      </section>

      {/* Contacto */}
      <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-16 py-16 md:py-[150px] flex flex-col items-center gap-5 md:gap-7 text-center">
        <p className="font-serif italic text-white text-5xl md:text-[152px] md:leading-[148px] tracking-tight md:tracking-[-3.04px] min-w-0">Hablemos.</p>
        <p className="text-white/75 text-base md:text-[22px] min-w-0">Un asesor de Duclaud te responde en horario hábil.</p>
        <div className="flex gap-3 pt-3 flex-wrap justify-center">
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="bg-white text-navy font-semibold px-8 py-[18px] rounded-full hover:bg-stone transition-colors">
            Escribir por WhatsApp
          </a>
          <Link href="/contacto" className="border border-white/30 text-white font-semibold px-8 py-[18px] rounded-full hover:bg-white/10 transition-colors">
            Agendar visita
          </Link>
        </div>
      </section>

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
