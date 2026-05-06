import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Carta de Derechos del Consumidor — Inmobiliaria BS Mérida" };

const DERECHOS = [
  "Recibir, respecto de los servicios ofertados, información y publicidad veraz, clara y actualizada, sin importar el medio por el que se comunique, incluyendo los medios digitales, de forma tal que le permita a EL CONSUMIDOR tomar la mejor decisión respecto de los servicios que contrate a EL ASESOR INMOBILIARIO.",
  "Acceder a la lectura, ser informado y resolver las dudas que presente respecto del contenido y alcance del Contrato de Adhesión registrado en el Registro Público de Contratos de Adhesión de la Procuraduría Federal del Consumidor, bajo el número 5589-2022, de fecha 03 de octubre de 2022, de conformidad con el segundo párrafo del artículo 73 de la Ley Federal de Protección al Consumidor, así como ser informado acerca de que cualquier variación del presente anexo del Contrato en perjuicio del Consumidor o Consumidores, frente al contrato de adhesión registrado 5589-2022, se tendrá por no puesta.",
  "En caso de que se trate de un comprador, podrá conocer la información sobre las características del inmueble destinado a casa habitación, entre éstas: la extensión del terreno, superficie construida, tipo de estructura, instalaciones, acabados, accesorios, lugar de estacionamiento, áreas de uso común, servicios con que cuenta y estado general físico del inmueble.",
  "En caso de que se trate de un comprador, elegir libremente el inmueble que mejor satisfaga sus necesidades y se ajuste a su capacidad de compra.",
  "En caso de que se trate de un comprador, no realizar pago alguno hasta que conste por escrito la relación contractual, exceptuando los referentes a anticipos y gastos operativos, en los términos previstos por la Ley Federal de Protección al Consumidor.",
  "Firmar un contrato de adhesión bajo el modelo inscrito en la Procuraduría Federal del Consumidor, en el que consten los términos y condiciones de la compraventa del bien inmueble. Posterior a su firma, EL ASESOR INMOBILIARIO tiene la obligación de entregarle una copia del contrato firmado.",
  "En caso de que se trate de un comprador, adquirir un inmueble que cuente con las características de seguridad y calidad que estén contenidas en la normatividad aplicable y plasmadas en la información y publicidad que haya recibido.",
  "En caso de que se trate de un comprador, recibir EL INMUEBLE en el plazo y condiciones acordados con el vendedor.",
  "En caso de inmuebles de primer uso, ejercer las garantías sobre bienes inmuebles previstas en la Ley Federal de Protección al Consumidor, su reglamento y en el numeral 7 de la NOM-247-SE-2021, considerando adicionalmente las especificaciones previstas en el contrato de adhesión respectivo, siempre que en el contrato no se establezcan plazos, condiciones o requisitos para hacerlas valer mayores o contrarios a los establecidos en la legislación señalada.",
  "En caso de inmuebles de primer uso, recibir la bonificación o compensación correspondiente en términos de la Ley Federal de Protección al Consumidor, su reglamento y en el numeral 7 de la NOM-247-SE-2021, en caso de que, una vez ejercida la garantía, persistan defectos o fallas en el inmueble. Asimismo, a que se realicen las reparaciones necesarias en caso de defectos o fallas imputables al proveedor, u optar por la substitución del inmueble o rescisión del contrato cuando proceda.",
  "Contar con canales y mecanismos de atención gratuitos y accesibles para consultas, solicitudes, reclamaciones y sugerencias a EL ASESOR INMOBILIARIO, y conocer el domicilio señalado por éste para recibir notificaciones.",
  "Derecho a la protección por parte de las autoridades competentes y conforme a las leyes aplicables, incluyendo el derecho a presentar denuncias y reclamaciones ante las mismas.",
  "Tener a su disposición un Aviso de Privacidad para conocer el tratamiento que se dará a los datos personales que proporcione y consentirlo, en su caso; que sus datos personales sean tratados conforme a la normatividad aplicable y, conocer los mecanismos disponibles para realizar el ejercicio de sus Derechos de Acceso, Rectificación, Cancelación y Oposición.",
  "Recibir un trato libre de discriminación, sin que se le pueda negar o condicionar la atención o venta de una vivienda por razones de género, nacionalidad, étnicas, preferencia sexual, religiosas o cualquiera otra particularidad en los términos de la legislación aplicable.",
  "Elegir libremente al notario público para realizar el trámite de escrituración del inmueble destinado a casa habitación que adquiera a través de los servicios prestados por EL ASESOR INMOBILIARIO.",
  "Conocer, por tratarse de información pública, el Código de Ética de la Asociación Mexicana de Profesionales Inmobiliarios, A.C. aprobado el 03 de junio de 2022 en Asamblea Extraordinaria celebrada en Guaymas, Sonora, el cual orienta la conducta ética de EL ASESOR INMOBILIARIO.",
];

export default function DerechosClientesPage() {
  return (
    <>
      <PublicHeader />
      <div className="max-w-4xl mx-auto px-8 py-20">
        <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Información al consumidor</div>
        <h1 className="text-4xl font-semibold text-ink tracking-tight mt-3 leading-tight">
          Carta de derechos del consumidor
        </h1>
        <p className="text-lg text-ink-muted leading-relaxed mt-6">
          De acuerdo con el contrato de adhesión registrado ante la Procuraduría Federal del Consumidor número <strong>5589-2022</strong>, todo cliente de Inmobiliaria BS Mérida tiene los siguientes derechos:
        </p>

        <ol className="mt-12 space-y-6">
          {DERECHOS.map((d, i) => (
            <li key={i} className="flex gap-5 pb-6 border-b border-ink-line last:border-0">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-semibold">{i + 1}</span>
              <p className="text-ink leading-relaxed flex-1 text-[15px]">{d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 p-6 bg-brand-50 border border-brand-200 rounded-2xl">
          <h3 className="font-semibold text-ink">¿Cómo presentar una queja o sugerencia?</h3>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">
            Puedes contactarnos directamente a <strong>{process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com"}</strong> o al teléfono <strong>{process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815"}</strong>. Si lo consideras necesario, también puedes acudir a la Procuraduría Federal del Consumidor (PROFECO) en <a href="https://www.gob.mx/profeco" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">gob.mx/profeco</a>.
          </p>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
