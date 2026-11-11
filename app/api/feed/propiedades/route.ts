import { portalFeed } from "@/lib/portal-feed";

export const revalidate = 3600; // cache 1 hora

// Propiedades marcadas con "Publicar en propiedades" en el formulario
export const GET = portalFeed("publicar_propiedades");
