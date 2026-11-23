// lib/googleMaps.ts
// Carga única y perezosa del script de Google Maps (con la librería Places),
// compartida por el mapa público y los buscadores con autocompletado — para
// no repetir este cargador en cada componente y que no se desalineen.
declare global { interface Window { google: any } }

let promise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (promise) return promise;
  promise = new Promise(resolve => {
    if (window.google?.maps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return promise;
}
