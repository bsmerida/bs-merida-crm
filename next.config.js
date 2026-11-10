/** @type {import('next').NextConfig} */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // El filtro XSS de navegadores viejos es obsoleto y puede introducir fugas; se desactiva explícitamente
  { key: "X-XSS-Protection",          value: "0" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
  // En modo Report-Only: no bloquea nada, solo reporta en la consola del navegador
  // lo que bloquearía. Cuando no aparezcan avisos en el sitio y el CRM, cambiar la
  // clave a "Content-Security-Policy" para activarla.
  { key: "Content-Security-Policy-Report-Only", value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me https://cdnjs.cloudflare.com",
    "font-src 'self' data: https://fonts.gstatic.com https://rsms.me",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ") },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.tokkobroker.com" },
      { protocol: "https", hostname: "*.easybroker.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(feed|sofia|citas/solicitar|citas/confirmar-cliente)(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: SITE },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age",       value: "86400" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
