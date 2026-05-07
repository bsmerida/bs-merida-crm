export const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtNum = (n: number) => new Intl.NumberFormat("es-MX").format(n);

export const ESTADOS_LEAD = [
  "Nuevo",
  "Contactado",
  "Calificado",
  "Visita agendada",
  "Visita realizada",
  "Oferta",
  "Negociación",
  "Cerrado ganado",
  "Cerrado perdido",
] as const;

export const TIPOS_PROPIEDAD = ["Casa", "Departamento", "Oficina", "Local", "Terreno", "Bodega"] as const;
export const OPERACIONES = ["Venta", "Renta"] as const;
export const ESTADOS_PROPIEDAD = ["Disponible", "Reservada", "Vendida", "Rentada", "Pausada"] as const;
