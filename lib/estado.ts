// lib/estado.ts
// Salud del sistema para /api/estado (lo revisa un monitor externo).

// El agente de fuentes corre a diario a las 6:00; más de 30 h sin una corrida
// terminada significa que algo falló (GitHub Actions, llaves, etc.).
export const HORAS_MAX_SIN_AGENTE = 30;

export type Estado = {
  ok: boolean;
  base_de_datos: "ok" | "error";
  agente_fuentes: "ok" | "atrasado" | "sin_datos";
  horas_desde_ultima_corrida: number | null;
};

export function evaluarEstado(
  { bdOk, ultimaCorridaFin }: { bdOk: boolean; ultimaCorridaFin: string | null },
  ahora = new Date(),
): Estado {
  const horas = ultimaCorridaFin
    ? Math.round(((ahora.getTime() - new Date(ultimaCorridaFin).getTime()) / 3_600_000) * 10) / 10
    : null;
  const agente = horas === null ? "sin_datos" : horas > HORAS_MAX_SIN_AGENTE ? "atrasado" : "ok";
  return {
    ok: bdOk && agente === "ok",
    base_de_datos: bdOk ? "ok" : "error",
    agente_fuentes: agente,
    horas_desde_ultima_corrida: horas,
  };
}

// Error del navegador porque se publicó una versión nueva con la página abierta:
// los archivos de la versión vieja ya no existen.
export function esVersionNueva(error: { name?: string; message?: string }): boolean {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Failed to load chunk/i
    .test(`${error.name ?? ""} ${error.message ?? ""}`);
}
