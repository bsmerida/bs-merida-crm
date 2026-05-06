import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Aviso de Privacidad — Inmobiliaria BS Mérida" };

export default function AvisoPrivacidadPage() {
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com";

  return (
    <>
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-8 py-20">
        <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Información legal</div>
        <h1 className="text-4xl font-semibold text-ink tracking-tight mt-3 leading-tight">
          Aviso de Privacidad
        </h1>

        <div className="mt-10 space-y-6 text-ink leading-relaxed text-[17px]">
          <p>
            <strong>BS MERIDA</strong> es responsable del uso y manejo de los datos personales que usted voluntariamente nos proporcione, de acuerdo a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
          </p>

          <p>
            La información personal se utilizará, principalmente, para informarle acerca de los trabajos de promoción de su inmueble y, básicamente, será su <strong>Nombre, Teléfono y Correo Electrónico</strong>, los cuales se conservarán de manera confidencial.
          </p>

          <p>
            Aunque nosotros no proporcionamos sus datos a ninguna persona o sociedad alguna sin su expreso consentimiento, usted puede, en cualquier momento, solicitarnos el <strong>Acceso, Rectificación y Cancelación</strong> de los mismos o la <strong>Oposición</strong> a su manejo, a través del correo:{" "}
            <a href={`mailto:${email}`} className="text-brand-600 hover:underline font-medium">{email}</a>.
          </p>

          <p>
            Cualquier cambio al presente aviso de privacidad será publicado en este mismo apartado.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-line text-sm text-ink-muted">
          Última actualización: {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
