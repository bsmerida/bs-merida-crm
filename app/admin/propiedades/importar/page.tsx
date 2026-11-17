import Link from "next/link";
import { PropertiesImporter } from "@/components/PropertiesImporter";
import { Icon } from "@/components/Icon";

export default function ImportarPropiedadesPage() {
  return (
    <div className="p-10 max-w-4xl space-y-6">
      <div>
        <Link href="/admin/propiedades" className="text-sm text-[#6b7385] hover:text-navy mb-3 inline-flex items-center gap-1">← Volver a propiedades</Link>
        <h1 className="font-serif text-navy text-2xl tracking-tight mt-2">Importar propiedades en lote</h1>
        <p className="text-sm text-[#6b7385] mt-0.5">Sube todas tus propiedades de una vez desde un archivo CSV o Excel</p>
      </div>

      <div className="bg-cream border border-gold/30 rounded-2xl p-6">
        <h3 className="font-semibold text-navy flex items-center gap-2">
          <Icon name="check" className="w-5 h-5 text-gold" />
          Cómo funciona
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-navy leading-relaxed">
          <li><strong>1.</strong> Descarga la plantilla CSV de abajo y ábrela en Excel, Numbers o Google Sheets.</li>
          <li><strong>2.</strong> Llena una fila por cada propiedad. Solo `título`, `tipo`, `operación` y `precio` son obligatorios.</li>
          <li><strong>3.</strong> Guarda como CSV (formato delimitado por comas).</li>
          <li><strong>4.</strong> Súbelo aquí. El sistema te muestra una vista previa antes de crear todo.</li>
          <li><strong>5.</strong> Confirma. Las propiedades se crean al instante en tu inventario.</li>
        </ol>
      </div>

      <div className="bg-white rounded-[28px] shadow-float p-6">
        <h3 className="font-semibold text-navy mb-4">Plantilla</h3>
        <a
          href="/api/template/propiedades.csv"
          download="plantilla_propiedades.csv"
          className="inline-flex items-center gap-2 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-navy/80"
        >
          <Icon name="arrowDown" className="w-4 h-4" /> Descargar plantilla CSV
        </a>
        <details className="mt-5">
          <summary className="text-sm text-gold cursor-pointer hover:underline">¿Qué columnas tiene la plantilla?</summary>
          <div className="mt-3 text-xs text-[#6b7385] bg-stone rounded-lg p-4 font-mono leading-relaxed">
            <strong className="text-navy">Obligatorias:</strong> title, type, operation, price<br/>
            <strong className="text-navy mt-2 inline-block">Opcionales:</strong> description, address, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, is_published<br/>
            <br/>
            <strong className="text-navy">Valores válidos:</strong><br/>
            • <strong>type</strong>: Casa, Departamento, Oficina, Local, Terreno, Bodega<br/>
            • <strong>operation</strong>: Venta, Renta<br/>
            • <strong>amenities</strong>: separadas por pipe (|), ej. “Alberca|Jardín|Seguridad”<br/>
            • <strong>is_published</strong>: TRUE o FALSE (default TRUE)
          </div>
        </details>
      </div>

      <PropertiesImporter />

      <div className="bg-stone rounded-2xl p-6">
        <h4 className="font-semibold text-navy text-sm">Para migrar tu inventario actual</h4>
        <p className="text-sm text-[#6b7385] mt-2 leading-relaxed">
          Si tus propiedades están publicadas en bsmerida.com o en portales como Inmuebles24, lo más rápido es:
        </p>
        <ul className="text-sm text-[#6b7385] mt-3 space-y-1.5 list-disc list-inside">
          <li>Pedirle al equipo de tu sitio actual que te exporte un CSV o Excel con el inventario</li>
          <li>Si no se puede exportar, capturarlas manualmente en la plantilla (recomendado: contratar a alguien por 1-2 días para que lo haga, costo ~150-200 MXN/hora)</li>
          <li>Si tienes muchas (50+), considera repartirlo entre tus asesores: cada uno captura las que él captó originalmente</li>
        </ul>
      </div>
    </div>
  );
}
