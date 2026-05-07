import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { CopyableUrl } from "@/components/CopyableUrl";

const PORTALES = [
  {
    nombre: "Inmuebles24",
    web: "https://anunciante.inmuebles24.com",
    descripcion: "El portal #1 en México. Acepta feed XML.",
    pasos: [
      "Crea cuenta de agente en anunciante.inmuebles24.com",
      "Pide a tu ejecutivo que active la 'sincronización por feed XML'",
      "Pega ahí la URL del feed (botón 'Copiar' arriba)",
      "Ellos importan el inventario cada 24 hrs automáticamente"
    ],
    precio: "Desde 1,200 MXN/mes (paquete agente)",
  },
  {
    nombre: "Vivanuncios",
    web: "https://www.vivanuncios.com.mx/profesionales",
    descripcion: "Segundo en volumen. Alto tráfico fuera de CDMX. Acepta XML.",
    pasos: [
      "Da de alta tu cuenta profesional en vivanuncios.com.mx/profesionales",
      "En la sección 'Sincronización', elige 'Feed XML estándar'",
      "Pega la URL del feed",
      "Importan automáticamente cada 12-24 hrs"
    ],
    precio: "Desde 800 MXN/mes",
  },
  {
    nombre: "Lamudi",
    web: "https://www.lamudi.com.mx",
    descripcion: "Foco en propiedades premium. Acepta XML estándar.",
    pasos: [
      "Crea cuenta de inmobiliaria en Lamudi México",
      "Solicita activación de 'feed automatizado' al ejecutivo",
      "Pega URL del feed",
      "Sincronización diaria"
    ],
    precio: "Desde 1,500 MXN/mes",
  },
  {
    nombre: "Propiedades.com",
    web: "https://propiedades.com",
    descripcion: "Aceptan publicación gratuita por feed.",
    pasos: [
      "Regístrate como agente en propiedades.com",
      "Sube el feed en tu perfil de agente",
      "Publicación gratis básica"
    ],
    precio: "Gratis (con upgrades pagados)",
  },
  {
    nombre: "MercadoLibre",
    web: "https://www.mercadolibre.com.mx/inmuebles",
    descripcion: "MercadoLibre Inmuebles. Tiene API propia, no acepta XML directo.",
    pasos: [
      "Para sincronizar requiere implementar API privada de MercadoLibre",
      "Alternativa: publicar manualmente (mucho trabajo)",
      "Otra alternativa: usar EasyBroker que ya tiene la integración"
    ],
    precio: "Comisión por venta",
  },
  {
    nombre: "EasyBroker (agregador)",
    web: "https://easybroker.com",
    descripcion: "Servicio comercial que distribuye a +30 portales con un solo formulario. Recomendado si no quieres dar de alta cada uno.",
    pasos: [
      "Contrata cuenta en easybroker.com",
      "Sube tu inventario en su plataforma (o conecta vía su API)",
      "Ellos distribuyen a Inmuebles24, Vivanuncios, Lamudi, MercadoLibre y +30 más",
      "Recomendable solo si tienes 30+ propiedades activas"
    ],
    precio: "Desde 1,499 MXN/mes",
  },
];

export default async function PortalesAdminPage() {
  const supabase = createClient();
  const { count: propsCount } = await supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_published", true);

  const headersList = headers();
  const host = headersList.get("host") || "tudominio.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const feedUrl = `${protocol}://${host}/api/feed/xml`;

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Portales inmobiliarios</h1>
        <p className="text-sm text-ink-muted mt-0.5">Cómo conectar tu inventario con los portales más importantes de México</p>
      </div>

      {/* Feed URL */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-8 text-white">
        <div className="text-xs uppercase tracking-wider opacity-70">Tu URL de Feed XML</div>
        <h3 className="text-xl font-semibold tracking-tight mt-2">Esta URL es tu inventario sincronizable</h3>
        <p className="text-sm opacity-80 mt-2 leading-relaxed">
          La copias y la pegas en cada portal. Ellos la consultan cada 12-24 hrs y mantienen tu inventario sincronizado automáticamente. Cuando publiques una propiedad nueva o pauses una, se reflejará en todos los portales en menos de 1 día.
        </p>
        <div className="mt-5">
          <CopyableUrl url={feedUrl} />
        </div>
        <div className="mt-4 text-xs opacity-80">
          Actualmente: <strong>{propsCount || 0} propiedades</strong> en tu feed
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Icon name="check" className="w-5 h-5 text-amber-700" />
          Cómo funciona realmente la sincronización
        </h3>
        <p className="text-sm text-ink-muted mt-3 leading-relaxed">
          <strong>Tú publicas tu inventario aquí, en este CRM.</strong> Cada portal de la lista de abajo "consume" tu feed y publica las propiedades en su sitio. Cuando agregas, editas o pausas una propiedad, los portales lo detectan en su próxima sincronización (cada 12-24 horas dependiendo del portal).
        </p>
        <p className="text-sm text-ink-muted mt-3 leading-relaxed">
          <strong>Lo que SÍ tienes que hacer en cada portal (una sola vez):</strong> crear cuenta de agente, contratar el plan adecuado, y darles tu URL de feed. Después olvídate, todo es automático.
        </p>
      </div>

      {/* Lista de portales */}
      <div className="space-y-4">
        {PORTALES.map(p => (
          <div key={p.nombre} className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink text-lg">{p.nombre}</h3>
                  <a href={p.web} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">Sitio →</a>
                </div>
                <p className="text-sm text-ink-muted mt-1">{p.descripcion}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-muted">Costo aprox.</div>
                <div className="text-sm font-semibold text-ink">{p.precio}</div>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-ink-line">
              <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-3">Cómo conectarlo</div>
              <ol className="space-y-2">
                {p.pasos.map((paso, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[11px] font-semibold">{i + 1}</span>
                    {paso}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-ink-ghost rounded-2xl p-6">
        <h3 className="font-semibold text-ink">¿Por dónde empezar?</h3>
        <p className="text-sm text-ink-muted mt-2 leading-relaxed">
          Mi recomendación: empieza con <strong>Inmuebles24 + Vivanuncios</strong> (cubren ~70% del tráfico). Si después necesitas más alcance sin trabajo manual, evalúa <strong>EasyBroker</strong>. MercadoLibre déjalo para el final, requiere desarrollo extra.
        </p>
      </div>
    </div>
  );
}
