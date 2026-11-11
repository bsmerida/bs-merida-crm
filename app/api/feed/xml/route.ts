import { portalFeed } from "@/lib/portal-feed";

export const revalidate = 3600; // cache 1 hora

// Feed general: todas las propiedades publicadas y disponibles
export const GET = portalFeed();
