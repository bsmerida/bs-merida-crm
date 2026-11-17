import { createAdminClient } from "@/lib/supabase/server";
import { LogoUploader } from "@/components/LogoUploader";

export default async function BrandingPage() {
  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("business_settings").select("*").eq("id", 1).single();

  return (
    <div className="p-4 md:p-6 max-w-3xl font-dmsans">
      <div>
        <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
          Marca<em className="italic font-serif text-gold">.</em>
        </h1>
        <p className="text-[#6b7385] text-[15px] mt-1">Logo e identidad visual del sitio</p>
      </div>

      <div className="mt-8 bg-white rounded-[28px] shadow-float p-8">
        <h3 className="font-semibold text-navy">Logo de la empresa</h3>
        <p className="text-sm text-[#6b7385] mt-1">
          Sube tu logo en formato PNG, JPG o SVG. Se va a usar en el header del sitio público y en el admin. Recomendación: usa fondo transparente (PNG o SVG).
        </p>
        <div className="mt-6">
          <LogoUploader currentLogoUrl={settings?.logo_url || null} />
        </div>
      </div>

      <div className="mt-6 bg-cream border border-gold/30 rounded-2xl p-6">
        <h4 className="font-semibold text-navy text-sm">¿Cómo funciona?</h4>
        <p className="text-sm text-[#6b7385] mt-2 leading-relaxed">
          Tu logo se guarda en almacenamiento seguro (Supabase Storage). Cuando lo cambies, el sitio se actualiza al instante en todas las páginas — no necesitas redeployar ni tocar GitHub.
        </p>
      </div>
    </div>
  );
}
