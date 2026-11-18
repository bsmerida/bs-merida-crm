// lib/public-nav.ts
// Enlaces del menú del sitio público. En su propio archivo (sin "use client")
// para que lo puedan importar tanto el header (componente de cliente, por el
// menú móvil) como componentes de servidor (footer, home) sin arrastrar el
// componente de cliente completo.
export const NAV_V3 = [
  { href: "/",         l: "Inicio"             },
  { href: "/comprar",  l: "Comprar"            },
  { href: "/rentar",   l: "Rentar"             },
  { href: "/vender",   l: "Vender"             },
  { href: "/mapa",     l: "Mapa"               },
  { href: "/nosotros", l: "Acerca de nosotros" },
  { href: "/contacto", l: "Contacto"           },
];
