# CRM Duclaud — guía para trabajar en este repo

CRM inmobiliario de Duclaud Bienes Raíces (Mérida). Sitio público (catálogo, fichas, citas, chatbot "Sofía", feeds a portales) + panel `/admin` (clientes, propiedades, citas, tareas, finanzas, agente de fuentes).

## Comandos
```bash
npm ci                 # instalar (usa package-lock)
npm run dev            # local en http://localhost:3000
npm run check          # typecheck + lint + pruebas (correr antes de cada PR)
npm test               # Vitest
npm run build          # build de producción
node --env-file=.env.local scripts/revisar-fuentes.mjs   # agente de fuentes a mano
```
Nunca `source .env.local` en la terminal: imprime las llaves. Usa `node --env-file`.

## Ambientes
| | Producción | Pruebas |
|---|---|---|
| Hosting | Vercel → www.duclaud.com.mx (cada merge a `main` despliega) | — (pendiente) |
| Base de datos | Supabase de Duclaud (la de `.env.local`) | `duclaud-pruebas` (pendiente de crear) |
| Tareas programadas | GitHub Actions: `fuentes.yml` (diario 6:00 Mérida), `notificaciones.yml` (cada hora) | — |

- Todo lo de producción es irreversible: solo lectura salvo autorización explícita.
- La conexión MCP de Supabase de esta máquina es de **otra cuenta (HotPot Factor)**: no usarla para Duclaud.
- El esquema base (properties, leads, deals…) **no está versionado**; solo hay migraciones del agente de fuentes y conteos. Ver PENDIENTES.md.

## Arquitectura
- Next.js 14 (App Router) + Supabase (`@supabase/ssr`). Páginas en `app/`, rutas API en `app/api/**/route.ts`.
- `lib/supabase/server.ts`: `createClient()` (sesión del usuario, respeta RLS) y `createAdminClient()` (service role, **solo servidor**, se salta RLS).
- `middleware.ts` + `lib/supabase/middleware.ts`: exige sesión en `/admin` y rol admin en `ADMIN_ONLY_PATHS`.
- `lib/auth.ts`: `requireAuth({admin})`, `canManage()` para rutas API.
- Muchos componentes del panel escriben directo desde el navegador con la llave pública (finanzas, propiedades, clientes): su seguridad depende de las políticas RLS en Supabase.
- `lib/security.ts`: escape HTML/XML, `rateLimit` (Upstash si hay variables; si no, memoria local por instancia).
- Agente de fuentes: `scripts/revisar-fuentes.mjs` + `scripts/fuentes/**` (GitHub Actions, Node 24).

## Reglas del negocio y de trabajo
- Carpetas de proveedores (Drive/Dropbox): **solo lectura**. Nada se publica ni despublica solo; el agente propone borradores que una persona aprueba en `/admin/fuentes`. Un archivo que desaparece nunca significa "vendido".
- El agente no escribe en `properties`; solo vía borradores aprobados.
- Llaves solo en variables de entorno; `.env.local` y `.next` en `.gitignore`. Nunca imprimir ni commitear secretos.
- Nunca trabajar en `main`: rama → PR → CI en verde (`gh pr checks --json name,state`) → merge con permiso del dueño (merge = deploy a producción).
- Cambios de BD: SQL idempotente en `supabase/migrations/`, primero en pruebas, luego producción, y antes del código que lo necesita.
- Borrados, pagos y textos legales: preguntar primero y respaldar.
- Fechas `YYYY-MM-DD` de la BD: no usar `new Date("YYYY-MM-DD")` (lo toma como UTC y en Mérida cae el día anterior).
- Supabase devuelve máx. 1000 filas por consulta; paginar con `.order()` único + `.range()`. `.in()` con cientos de ids rompe la URL: partir en lotes.
- El dueño (GitHub `bsmerida`) prefiere explicaciones en español, simples y paso a paso.
