import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";

export const metadata = { title: "Carta de Derechos del Consumidor — Duclaud Bienes Raíces" };

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
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "contacto@duclaud.com.mx";
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 746 6272";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="" />

      <section className="pt-10 md:pt-24 px-5 md:px-16">
        <p className="text-gold text-[13px] font-semibold tracking-[3.12px]">INFORMACIÓN AL CONSUMIDOR</p>
        <h1 className="font-serif text-navy text-4xl md:text-7xl mt-3 md:mt-4 min-w-0">Carta de derechos del consumidor.</h1>
        <p className="text-[#6b7385] text-base md:text-[20px] md:leading-[26px] mt-4 md:mt-6 max-w-[900px] min-w-0">
          De acuerdo con el contrato de adhesión registrado ante la Procuraduría Federal del Consumidor número <strong className="text-navy">5589-2022</strong>, todo cliente de Duclaud tiene los siguientes derechos:
        </p>

        <ol className="mt-10 md:mt-14">
          {DERECHOS.map((d, i) => (
            <li key={i} className="flex gap-4 md:gap-6 py-5 border-b border-stone last:border-0">
              <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-stone text-navy flex items-center justify-center text-sm font-semibold shrink-0">{i + 1}</span>
              <p className="text-navy text-[15px] md:text-[18px] leading-6 md:leading-7">{d}</p>
            </li>
          ))}
        </ol>

        <div className="bg-stone rounded-[28px] md:rounded-[36px] px-7 md:px-10 py-8 md:py-9 mt-10 mb-12 md:mb-16">
          <h3 className="font-serif text-navy text-2xl md:text-[40px] md:leading-[42px]">¿Cómo presentar una queja o sugerencia?</h3>
          <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] mt-2.5">
            Escríbenos a <a href={`mailto:${email}`} className="text-navy hover:text-gold transition-colors font-medium">{email}</a> o llama al <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}`} target="_blank" rel="noopener noreferrer" className="text-navy hover:text-gold transition-colors font-medium">{phone}</a>. Te atendemos de lunes a viernes de 9:00 a 18:00 y sábados de 10:00 a 14:00. Si lo consideras necesario, también puedes acudir a la Procuraduría Federal del Consumidor (PROFECO) en <a href="https://www.gob.mx/profeco" target="_blank" rel="noopener noreferrer" className="text-navy hover:text-gold transition-colors font-medium">gob.mx/profeco</a>.
          </p>
        </div>
      </section>

      <PublicFooterV3 />
    </div>
  );
}
