import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { EquipoClient } from "@/components/EquipoClient";

// Interruptor de solo lectura: el valor real se cambia por variable de entorno
// o viene de si la pantalla correspondiente ya existe, no desde aquí.
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 ${on ? "bg-navy" : "bg-stone-dk"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </span>
  );
}

const CAMPO = "bg-stone rounded-xl px-4 py-2.5 text-sm text-navy";

export default async function AjustesPage() {
  const supabase = createAdminClient();
  const auth = await getAuth();
  // La gestión de equipo es solo para admins; los asesores entran aquí para conectar su calendario
  const { data: profiles } = auth?.isAdmin
    ? await supabase.from("profiles").select("*").order("created_at")
    : { data: [] };

  const cumplimiento = [
    { label: "Aviso de privacidad publicado", on: true },
    { label: "Registro de consentimiento en formularios", on: true },
    { label: "Derechos de clientes (PROFECO) visibles", on: true },
    { label: "Verificación de documentos por propiedad", on: false },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            Ajustes<em className="italic font-serif text-gold">.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">Empresa, integraciones y equipo</p>
        </div>
        <Link href="/admin/branding"
          className="px-4 py-2.5 bg-cream hover:bg-stone text-navy rounded-full text-sm font-medium transition-colors">
          Marca
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] shadow-float p-6 space-y-4">
            <h3 className="font-serif text-navy text-[28px]">Empresa</h3>
            <div>
              <div className="text-xs text-[#6b7385] uppercase tracking-wide mb-1.5">Nombre</div>
              <div className={CAMPO}>Duclaud Bienes Raíces</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7385] uppercase tracking-wide mb-1.5">Teléfono</div>
              <div className={CAMPO}>999 746 6272</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7385] uppercase tracking-wide mb-1.5">Correo</div>
              <div className={CAMPO}>contacto@duclaud.com.mx</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone text-sm">
              {[
                ["Sitio web", "www.duclaud.com.mx"],
                ["Dirección oficina principal", "Calle 13 #147, Col. México Oriente, Mérida, Yucatán"],
                ["Sucursal", "San Pedro Garza García, Nuevo León"],
                ["WhatsApp", "999 746 6272"],
                ["Teléfono Monterrey", "81 4010 1300"],
                ["Membresía", "AMPI Mérida"],
                ["Certificación", "ECO110.02 · D-0036107323"],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-[#6b7385]">{l}</div>
                  <div className="text-navy mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6b7385]">Para cambiar estos datos, edita las variables de entorno en Vercel.</p>
          </div>

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
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[28px] shadow-float p-6">
            <h3 className="font-serif text-navy text-[28px] mb-1">Cumplimiento</h3>
            <p className="text-xs text-[#6b7385] mb-5">LFPDPPP (protección de datos) y normativa PLD · México</p>
            <div className="space-y-4">
              {cumplimiento.map(c => (
                <div key={c.label} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-navy">{c.label}</span>
                  <Toggle on={c.on} />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-stone space-y-2.5 text-sm text-navy">
              {[
                "Encriptación de datos sensibles en Supabase",
                "Registro de auditoría activo",
                "Mecanismo de derechos ARCO disponible",
                "Respaldos diarios con retención de 30 días (Supabase)",
              ].map(t => (
                <div key={t} className="flex items-center gap-3"><Icon name="check" className="w-4 h-4 text-gold shrink-0" /> {t}</div>
              ))}
            </div>
          </div>

          {auth?.isAdmin && <EquipoClient profiles={profiles || []} currentUserId={auth.userId} />}
        </div>
      </div>
    </div>
  );
}
