"use client";
import { useState } from "react";
import { AgendarCitaModal } from "@/components/AgendarCitaModal";

type Props = {
  propertyId: string;
  propertyTitle: string;
  propertyUrl: string;
  propertyOperation: string;
  waNumber: string;
  waMsg: string;
  agentId?: string | null;
  propertyCover?: string | null;
  propertyPriceLabel?: string | null;
};

export function PropertyContactButtons({ propertyId, propertyTitle, propertyUrl, propertyOperation, waNumber, waMsg, agentId = null, propertyCover = null, propertyPriceLabel = null }: Props) {
  const [showModal, setShowModal] = useState(false);

  const openSofia = () => {
    window.dispatchEvent(new CustomEvent("sofia:open", {
      detail: { id: propertyId, title: propertyTitle, url: propertyUrl, operation: propertyOperation },
    }));
  };

  return (
    <>
      <div className="space-y-2.5 w-full">
        {/* Agendar visita — CTA principal */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-navy hover:bg-navy-mid text-white font-semibold py-[18px] rounded-full transition-colors">
          Agendar visita
        </button>

        <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center w-full bg-stone hover:bg-stone-dk text-navy font-semibold py-[18px] rounded-full transition-colors">
          Escribir por WhatsApp
        </a>

        <button onClick={openSofia}
          className="w-full bg-stone hover:bg-stone-dk text-navy font-medium py-3 rounded-full transition-colors">
          Consultar con Sofía
        </button>

        <div className="flex gap-2">
          <a href={`/api/propiedad/${propertyId}/pdf?mode=cliente`}
            className="flex-1 bg-cream hover:bg-stone text-navy text-center font-medium py-2.5 rounded-full transition-colors text-sm">
            Para cliente
          </a>
          <a href={`/api/propiedad/${propertyId}/pdf?mode=asesor`}
            className="flex-1 bg-cream hover:bg-stone text-navy text-center font-medium py-2.5 rounded-full transition-colors text-sm">
            Para asesor
          </a>
        </div>
      </div>

      {showModal && (
        <AgendarCitaModal
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          agentId={agentId}
          onClose={() => setShowModal(false)}
          propertyCover={propertyCover}
          propertyPriceLabel={propertyPriceLabel}
        />
      )}
    </>
  );
}
