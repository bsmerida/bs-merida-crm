"use client";
import { useEffect } from "react";

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    // Registrar vista después de 2 seg para evitar bots y rebotes inmediatos
    const t = setTimeout(() => {
      fetch(`/api/properties/${propertyId}/view`, { method: "POST" }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [propertyId]);

  return null;
}
