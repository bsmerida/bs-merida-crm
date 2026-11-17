import { createAdminClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { EquipoClient } from "@/components/EquipoClient";

export default async function AjustesPage() {
  const supabase = createAdminClient();
  const auth = await getAuth();
  // La gestión de equipo es solo para admins; los asesores entran aquí para conectar su calendario
  const { data: profiles } = auth?.isAdmin
    ? await supabase.from("profiles").select("*").order("created_at")
    : { data: [] };

  return (
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div>
        <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
          Ajustes<em className="italic font-serif text-gold">.</em>
        </h1>
        <p className="text-[#6b7385] text-[15px] mt-1">Empresa, usuarios y cumplimiento</p>
      </div>

      <div className="bg-white rounded-[28px] shadow-float p-6">
        <h3 className="font-serif text-navy text-[28px] mb-5">Datos de la empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            ["Nombre comercial", "Duclaud Bienes Raíces"],
            ["Sitio web", "www.duclaud.com.mx"],
            ["Dirección oficina principal", "Calle 13 #147, Col. México Oriente, Mérida, Yucatán"],
            ["Sucursal", "San Pedro Garza García, Nuevo León"],
            ["Teléfono Mérida", "999 746 6272"],
            ["WhatsApp", "999 746 6272"],
            ["Teléfono Monterrey", "81 4010 1300"],
            ["Correo", "contacto@duclaud.com.mx"],
            ["Membresía", "AMPI Mérida"],
            ["Certificación", "ECO110.02 · D-0036107323"],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-[#6b7385]">{l}</div>
              <div className="text-navy mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6b7385] mt-6">Para cambiar estos datos, edita las variables de entorno en Vercel.</p>
      </div>

      {auth?.isAdmin && <EquipoClient profiles={profiles || []} currentUserId={auth.userId} />}

      <div className="bg-white rounded-[28px] shadow-float p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-serif text-navy text-[28px]">Google Calendar</h3>
          <p className="text-xs text-[#6b7385] mt-1">Conecta tu calendario para que las visitas confirmadas se agenden solas.</p>
        </div>
        <a href="/api/citas/google-connect"
          className="px-4 py-2 bg-navy hover:bg-navy-mid text-white rounded-full text-sm font-medium">
          Conectar mi calendario
        </a>
      </div>

      <div className="bg-white rounded-[28px] shadow-float p-6">
        <h3 className="font-serif text-navy text-[28px] mb-1">Cumplimiento legal · México</h3>
        <p className="text-xs text-[#6b7385] mb-5">Configurado para cumplir con LFPDPPP (protección de datos) y normativa PLD.</p>
        <div className="space-y-3 text-sm text-navy">
          {[
            "Aviso de privacidad publicado y aceptado por todos los clientes",
            "Encriptación de datos sensibles en Supabase",
            "Registro de auditoría activo",
            "Mecanismo de derechos ARCO disponible",
            "Respaldos diarios con retención de 30 días (Supabase)",
          ].map(t => (
            <div key={t} className="flex items-center gap-3"><Icon name="check" className="w-4 h-4 text-gold" /> {t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
