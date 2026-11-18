"use client";
import { useState } from "react";
import { AgendarCitaModal } from "@/components/AgendarCitaModal";

type Props = {
  propertyId: string; propertyTitle: string; agentId: string | null;
  propertyCover?: string | null; priceLabel: string;
};

// Barra fija al pie en celular (Figma la muestra siempre visible al hacer
// scroll); en escritorio el precio y el botón ya viven en la tarjeta lateral.
export function MobileAgendarBar({ propertyId, propertyTitle, agentId, propertyCover = null, priceLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white shadow-float px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy text-lg leading-tight truncate">{priceLabel}</p>
          <p className="text-xs text-[#6b7385] truncate">{propertyTitle}</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="bg-navy hover:bg-navy-mid text-white font-semibold px-6 py-3 rounded-full transition-colors shrink-0">
          Agendar visita
        </button>
      </div>

      {/* Para que la barra fija no tape el contenido final de la página */}
      <div className="lg:hidden h-20" />

      {open && (
        <AgendarCitaModal
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          agentId={agentId}
          onClose={() => setOpen(false)}
          propertyCover={propertyCover}
          propertyPriceLabel={priceLabel}
        />
      )}
    </>
  );
}
