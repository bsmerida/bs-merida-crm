import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Nosotros — Inmobiliaria BS Mérida" };

export default function NosotrosPage() {
  const valores = [
    { t: "Integridad", d: "Honestidad y transparencia en todas las interacciones, priorizando la confianza como base de relaciones duraderas." },
    { t: "Profesionalismo", d: "Excelencia en asesoría certificada, con eficiencia y enfoque multidisciplinario para resultados óptimos." },
    { t: "Orientación al Cliente", d: "Soluciones personalizadas que satisfacen necesidades con calidad y servicio premium." },
  ];

  return (
    <>
      <PublicHeader />
      <div className="max-w-4xl mx-auto px-8 py-20">
        <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Quiénes somos</div>
        <h1 className="text-5xl font-semibold text-ink tracking-tight mt-3 leading-tight">
          Asesores inmobiliarios, no simples vendedores.
        </h1>
        <p className="text-lg text-ink-muted leading-relaxed mt-8">
          Inmobiliaria BS Mérida es una firma de asesores inmobiliarios certificados con sede en Mérida, Yucatán, especializada en compra, venta y renta de propiedades.
        </p>
        <p className="text-lg text-ink-muted leading-relaxed mt-6">
          Nos posicionamos como aliados estratégicos, no simples vendedores, ofreciendo acompañamiento personalizado para inversiones en Yucatán. Nuestro enfoque multidisciplinario integra aspectos inmobiliarios, legales y financieros para maximizar el valor patrimonial de los clientes.
        </p>

        <div className="mt-16 pt-12 border-t border-ink-line">
          <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Misión</div>
          <p className="text-lg text-ink leading-relaxed mt-4">
            Brindar asesoría inmobiliaria de alta calidad basada en confianza, profesionalismo y ética, maximizando el valor patrimonial de los clientes mediante soluciones personalizadas en compra, venta y gestión de bienes raíces en Mérida. Integramos un enfoque multidisciplinario (inmobiliario, legal y financiero) para decisiones informadas y seguras.
          </p>
        </div>

        <div className="mt-12 pt-12 border-t border-ink-line">
          <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Visión</div>
          <p className="text-lg text-ink leading-relaxed mt-4">
            Convertirnos en el referente premium de servicios inmobiliarios en Yucatán, destacando por innovación, procesos ágiles y sostenibles, y una experiencia 100% centrada en el cliente que redefine el mercado local. Transformamos transacciones en procesos transparentes y memorables.
          </p>
        </div>

        <div className="mt-12 pt-12 border-t border-ink-line">
          <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold mb-6">Valores fundamentales</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {valores.map(v => (
              <div key={v.t} className="bg-white rounded-2xl border border-ink-line p-6 shadow-card">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <Icon name="check" className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-ink tracking-tight">{v.t}</h3>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-ink-line">
          <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold mb-4">Credenciales</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-ink">
            <div className="flex items-start gap-2"><Icon name="check" className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />Socios AMPI Mérida</div>
            <div className="flex items-start gap-2"><Icon name="check" className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />Certificación ECO110.02 · D-0036107323</div>
            <div className="flex items-start gap-2"><Icon name="check" className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />Contrato PROFECO 5589-2022</div>
          </div>
        </div>
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
