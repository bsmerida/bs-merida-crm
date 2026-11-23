// lib/stats-descriptivas.ts
// Estadísticas descriptivas simples sobre una lista de números — usado para
// "presupuesto promedio por periodo" en Estadísticas de clientes. La moda de
// un valor continuo (dinero) no es un solo número exacto, así que se calcula
// sobre rangos (buckets), como un histograma: el rango con más valores.
export function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

export function mediana(valoresOrdenados: number[]): number | null {
  const n = valoresOrdenados.length;
  if (!n) return null;
  const mitad = Math.floor(n / 2);
  return n % 2 === 1 ? valoresOrdenados[mitad] : (valoresOrdenados[mitad - 1] + valoresOrdenados[mitad]) / 2;
}

export function modaPorRango<T extends { label: string; min: number; max: number }>(
  valores: number[],
  rangos: T[]
): string | null {
  if (!valores.length) return null;
  const conteos = rangos.map(r => ({ label: r.label, count: valores.filter(v => v >= r.min && v < r.max).length }));
  const top = conteos.sort((a, b) => b.count - a.count)[0];
  return top.count > 0 ? top.label : null;
}
