/** @type {import('next').NextConfig} */
 
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";
 
const securityHeaders = [
  // Evita que la página se cargue en iframes de otros dominios (clickjacking)
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  // Evita que el browser detecte tipo de contenido diferente al declarado
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Fuerza HTTPS por 1 año, incluye subdomios
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Bloquea XSS en browsers viejos
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  // No enviar referrer a sitios externos
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Limitar features del navegador
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
  // Content Security Policy — permite Google Maps, Supabase, Resend
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://maps.googleapis.com https://oauth2.googleapis.com https://www.googleapis.com https://api.anthropic.com`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com https://lh3.googleusercontent.com`,
      `frame-src 'self' https://maps.google.com`,
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];
 
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Security headers en todas las rutas
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // CORS solo en rutas API públicas (feed XML, chatbot público)
        source: "/api/(feed|chat-publico|citas/solicitar|citas/slots|citas/confirmar-cliente)(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: SITE },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age",       value: "86400" },
        ],
      },
      {
        // Rutas admin — solo mismo origen, no públicas
        source: "/api/admin/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: SITE },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};
 
module.exports = nextConfig;
 
