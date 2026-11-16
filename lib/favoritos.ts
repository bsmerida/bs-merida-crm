// lib/favoritos.ts
// Favoritos del visitante público: solo en su navegador (localStorage), sin
// cuenta ni backend. Si limpia su navegador o cambia de dispositivo, se pierde.
const KEY = "duclaud:favoritos";
const EVENT = "duclaud:favoritos-cambio";

function leer(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function escribir(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* localStorage no disponible (modo privado, etc.) */ }
}

export function esFavorito(id: string): boolean {
  return leer().includes(id);
}

export function listaFavoritos(): string[] {
  return leer();
}

export function alternarFavorito(id: string): boolean {
  const actuales = leer();
  const yaEsta = actuales.includes(id);
  escribir(yaEsta ? actuales.filter(x => x !== id) : [...actuales, id]);
  return !yaEsta;
}

export function suscribirFavoritos(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
