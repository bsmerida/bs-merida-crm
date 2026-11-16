import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";

export const metadata = { title: "Aviso de Privacidad — Duclaud Bienes Raíces" };

export default function AvisoPrivacidadPage() {
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "contacto@duclaud.com.mx";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="" />

      <section className="pt-10 md:pt-[72px] pb-6 md:pb-10 px-5 md:px-8 flex flex-col items-center text-center gap-2.5 md:gap-3.5">
        <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[92px] tracking-tight md:tracking-[-0.96px] min-w-0">
          Aviso de <em className="italic not-italic font-serif text-gold">privacidad.</em>
        </h1>
        <p className="text-[#6b7385] text-sm md:text-base">
          Última actualización: {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
        </p>
      </section>

      <section className="px-5 md:px-8 pb-12 md:pb-20 flex justify-center">
        <div className="max-w-[760px] w-full flex flex-col gap-8 md:gap-10">
          <p className="text-navy text-base md:text-[17px] leading-7">
            <strong>Duclaud Bienes Raíces</strong> es responsable del uso y manejo de los datos personales que usted voluntariamente nos proporcione, de acuerdo a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
          </p>
          <p className="text-navy text-base md:text-[17px] leading-7">
            La información personal se utilizará, principalmente, para informarle acerca de los trabajos de promoción de su inmueble y, básicamente, será su <strong>Nombre, Teléfono y Correo Electrónico</strong>, los cuales se conservarán de manera confidencial.
          </p>
          <p className="text-navy text-base md:text-[17px] leading-7">
            Aunque nosotros no proporcionamos sus datos a ninguna persona o sociedad alguna sin su expreso consentimiento, usted puede, en cualquier momento, solicitarnos el <strong>Acceso, Rectificación y Cancelación</strong> de los mismos o la <strong>Oposición</strong> a su manejo, a través del correo:{" "}
            <a href={`mailto:${email}`} className="text-gold hover:text-gold-dk font-medium">{email}</a>.
          </p>
          <p className="text-navy text-base md:text-[17px] leading-7">
            Cualquier cambio al presente aviso de privacidad será publicado en este mismo apartado.
          </p>
        </div>
      </section>

      <PublicFooterV3 />
    </div>
  );
}
