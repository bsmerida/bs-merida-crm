import Link from "next/link";
import { PropertiesImporter } from "@/components/PropertiesImporter";
import { Icon } from "@/components/Icon";

export default function ImportarPropiedadesPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5 font-dmsans">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/admin/propiedades" className="text-sm text-[#6b7385] hover:text-navy mb-3 inline-flex items-center gap-1">← Volver a propiedades</Link>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px] mt-2">
            Importar propiedades <em className="italic font-serif text-gold">en lote.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">Sube todas tus propiedades de una vez desde un archivo CSV o Excel</p>
        </div>
        <a
          href="/api/template/propiedades.csv"
          download="plantilla_propiedades.csv"
          className="inline-flex items-center gap-2 bg-stone hover:bg-stone-dk text-navy text-sm font-medium px-5 py-2.5 rounded-full shrink-0"
        >
          <Icon name="arrowDown" className="w-4 h-4" /> Descargar plantilla
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <PropertiesImporter />

          <div className="bg-white rounded-[28px] shadow-float p-6">
            <h3 className="font-serif text-navy text-[28px] mb-3">Para migrar tu inventario actual</h3>
            <p className="text-sm text-[#6b7385] leading-relaxed">
              Si tus propiedades están publicadas en bsmerida.com o en portales como Inmuebles24, lo más rápido es:
            </p>
            <ul className="text-sm text-[#6b7385] mt-3 space-y-1.5 list-disc list-inside">
              <li>Pedirle al equipo de tu sitio actual que te exporte un CSV o Excel con el inventario</li>
              <li>Si no se puede exportar, capturarlas manualmente en la plantilla (recomendado: contratar a alguien por 1-2 días para que lo haga, costo ~150-200 MXN/hora)</li>
              <li>Si tienes muchas (50+), considera repartirlo entre tus asesores: cada uno captura las que él captó originalmente</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-[28px] shadow-float p-6">
          <h3 className="font-serif text-navy text-[28px] mb-4 flex items-center gap-2">
            <Icon name="check" className="w-5 h-5 text-gold" />
            ¿Qué columnas tiene la plantilla?
          </h3>
          <div className="text-xs text-[#6b7385] bg-stone rounded-2xl p-4 font-mono leading-relaxed">
            <strong className="text-navy">Obligatorias:</strong> title, type, operation, price<br/>
            <strong className="text-navy mt-2 inline-block">Opcionales:</strong> description, address, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, is_published<br/>
            <br/>
            <strong className="text-navy">Valores válidos:</strong><br/>
            • <strong>type</strong>: Casa, Departamento, Oficina, Local, Terreno, Bodega<br/>
            • <strong>operation</strong>: Venta, Renta<br/>
            • <strong>amenities</strong>: separadas por pipe (|), ej. “Alberca|Jardín|Seguridad”<br/>
            • <strong>is_published</strong>: TRUE o FALSE (default TRUE)
          </div>
          <ol className="mt-5 space-y-2 text-sm text-navy leading-relaxed">
            <li><strong>1.</strong> Descarga la plantilla y ábrela en Excel, Numbers o Google Sheets.</li>
            <li><strong>2.</strong> Llena una fila por cada propiedad.</li>
            <li><strong>3.</strong> Guarda como CSV (formato delimitado por comas).</li>
            <li><strong>4.</strong> Súbelo aquí. El sistema te muestra una vista previa antes de crear todo.</li>
            <li><strong>5.</strong> Confirma. Las propiedades se crean al instante en tu inventario.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
