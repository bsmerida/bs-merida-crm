# Auditoría del CRM Duclaud — 10 nov 2026

Rama: `audit/seguridad-y-correcciones` (sin commit; revisa el diff antes de subir).

Verificación al cierre: `npm run typecheck` (modo **strict**) ✅ · `npm test` 59/59 ✅ · `npm run lint` 0 errores, 0 avisos ✅ · `next build` ✅

---

## 1. Acciones manuales URGENTES (no las pude hacer yo)

| # | Qué | Por qué |
|---|-----|---------|
| 1 | **Revocar el token de GitHub** `ghp_fuPD…` en github.com → Settings → Developer settings → Tokens | Está en texto plano en `.git/config` del repo interno (URL del remote). Cualquiera con acceso a esta máquina o a un respaldo puede escribir en el repo. |
| 2 | Cambiar el remote: `git remote set-url origin git@github-duclaud:bsmerida/bs-merida-crm.git` | Usa la llave SSH que ya tienes configurada, sin token en archivos. (Lo intenté y el sistema de permisos lo bloqueó.) |
| 3 | **Rotar la GEMINI_API_KEY** y no hacer push del repo externo `~/bs-merida-crm` | Ese clon viejo tiene un commit sin subir que agrega `.env.local` con la key. El código actual ya no usa Gemini. Lo ideal: borrar ese clon externo y trabajar solo en el interno. |
| 4 | Correr el SQL de la sección 6 en Supabase y revisar las políticas RLS | No pude acceder a tu proyecto de Supabase (la cuenta conectada solo tiene "HotPot Factor"). Gran parte de la seguridad de las páginas admin depende de RLS. |
| 5 | Confirmar en Supabase → Auth que **el registro público (sign-up) está desactivado** | Si está activo, cualquiera crea una cuenta y obtiene sesión de "usuario autenticado". |
| 6 | Volver a conectar Google Calendar de cada asesor desde **Ajustes → Conectar mi calendario** | El flujo OAuth ahora tiene protección CSRF; el botón es nuevo. Verifica que la URI de redirección en Google Cloud sea `https://<tu dominio>/api/citas/google-callback`. |

---

## 2. Seguridad — hallazgos corregidos

### Críticos
- **Rutas API sin autenticación usando la service role key** (saltándose toda la seguridad de la BD):
  - `DELETE /api/citas/[id]` — cualquiera podía borrar citas. → Ahora exige sesión y ser admin o el asesor asignado.
  - `POST/GET /api/citas/responder/[id]` — cualquiera podía confirmar/reagendar citas y disparar emails a clientes. → Exige sesión + permiso.
  - `POST /api/citas/crear` (sin uso) — creaba leads y sobrescribía notas de clientes existentes. → Eliminada.
  - `POST /api/push/send` — su "protección" dejaba pasar cualquier request sin header `Origin` (p. ej. `curl`): cualquiera podía mandar notificaciones a todo el equipo. → Eliminada; el envío ahora es una función interna (`lib/push.ts`).
  - `DELETE /api/push/suscribe` — sin sesión. → Exige sesión y solo borra suscripciones propias.
- **Proxies abiertos a la API de Anthropic (costo a tu cuenta):**
  - `/api/finanzas-ai` aceptaba peticiones sin sesión y con `system` prompt arbitrario. → Exige sesión, límite de 30/hora por usuario, tamaños acotados.
  - `/api/generar-reporte` (sin uso) — Claude Sonnet sin autenticación. → Eliminada.
  - `/api/sofia` (público por diseño) — aceptaba historiales de cualquier tamaño y roles arbitrarios; insertaba texto del navegador en el system prompt. → Validación estricta, 40 mensajes/hora por IP, contexto de la propiedad leído de la BD.
- **XSS reflejado en `/api/map-proxy`** (sin uso): devolvía un SVG con `lat`/`lng` sin escapar en tu dominio → robo de sesión con un link. → Eliminada.
- **OAuth de Google Calendar sin protección:** el callback guardaba tokens para el `profile_id` que viniera en `state`. Un atacante podía conectar *su* Google a la cuenta de un asesor y recibir las citas con datos de clientes. → `state` aleatorio en cookie httpOnly + se guarda para el usuario con sesión.
- **Next.js 14.2.13** con bypass de middleware (CVE-2025-29927) y otros avisos. → Actualizado a 14.2.35.

### Altos
- **Datos personales de propietarios expuestos:** `/comprar` y `/rentar` hacían `select("*")` y mandaban `owner_name`, `owner_email`, `owner_phone` al navegador (visibles en el código fuente). → Columnas explícitas (`lib/public-property.ts`) en todas las páginas públicas, ficha, PDF y feed.
- **Secciones admin accesibles por URL:** Finanzas, KPIs, Portales, Branding, Importar, Tokko, etc. solo se ocultaban del menú. → El middleware ahora verifica rol admin.
- **Borrado de clientes:** cualquier usuario podía borrar cualquier lead. → Solo admin o asesor asignado.
- **Inyección de HTML en emails:** nombre/propiedad/mensaje se insertaban sin escapar → phishing desde tu propio dominio. → Todo escapado (`lib/emails.ts`).
- **Mass assignment en tareas:** `insert({...body})` permitía escribir cualquier columna. → Lista blanca (`lib/tasks.ts`).
- **Gestión de usuarios:** aceptaba cualquier valor de `role`. → Solo `admin|asesor|asistente`, contraseña ≥10.
- **Usuarios desactivados** seguían entrando. → Se les cierra sesión y la API los rechaza.
- **Formulario público de visitas:** el título y el asesor venían del navegador. → Se leen de la BD (no se puede redirigir notificaciones a otro asesor).

### Medios / bajos
- Feed XML sin escapar (un título con `]]>` o `&` rompía el feed para los portales). → `lib/feed.ts`.
- Errores internos de BD/API devueltos al cliente. → Mensajes genéricos + `console.error`.
- `generar-descripcion` descargaba cualquier URL. → Solo `https`, solo imágenes, ≤5 MB.
- Sync de Tokko (reescribe el inventario) disponible para cualquier usuario. → Solo admin.
- Comparación del `CRON_SECRET` con `!==` y rechazo si no está configurado. → Comparación en tiempo constante.
- Cabeceras: `X-XSS-Protection: 0` (el valor anterior está obsoleto), sin `X-Powered-By`, CORS eliminado de `/api/admin`.

---

## 3. Bugs funcionales corregidos

| Bug | Efecto | Corrección |
|-----|--------|-----------|
| Carpeta `push/suscribe` vs llamada a `push/subscribe` | **Ninguna suscripción push se guardaba nunca** | Renombrada |
| `api/tareas/[id]` era una copia de la ruta de tableros | Editar tarea → error 405; borrar tarea no borraba (reaparecía al recargar) | PATCH/DELETE reales con permisos |
| Cron comparaba hora UTC con 7am/8am | **Las notificaciones diarias nunca se enviaban** | Hora de Mérida (`lib/time.ts`) |
| 3 crons de GitHub traslapados a las 13 y 14 UTC | Avisos "visita en 1h" duplicados | Un solo cron horario |
| Ventana de ±5 min para "visita en 1h" con cron de retraso variable | Avisos perdidos | Ventana de 60 min sin traslape (probado) |
| "Sin seguimiento" filtraba estados `Cerrado`/`Perdido` que no existen | Recordatorios de clientes ya cerrados | Usa `Cerrado ganado`/`Cerrado perdido` |
| Cliente elige opción del asesor → se confirmaba `client_options[i]` | **Se agendaba la fecha equivocada** | Se confirma `agent_options[i]` (probado) |
| `PropertyViewTracker` llamaba a una ruta inexistente | Ninguna vista de propiedad se contaba | `api/properties/[id]/view` (+ anti-recarga) |
| Memoria del asistente: `slice(0, -1+1)` = `[]` | El historial nunca llegaba al modelo | Corregido |
| Link "Ver en el CRM" del email → `/admin/citas/{id}` | 404 | `/admin/citas` |
| No existía forma de iniciar la conexión con Google Calendar en el código | — | Botón en Ajustes |

---

## 4. Arquitectura, escalabilidad y recursos

**Hecho:**
- Lógica duplicada consolidada: refresco de tokens de Google (estaba copiado 4 veces) → `lib/google-calendar.ts`; confirmación de citas → `lib/citas.ts`; 15 clientes service-role creados a mano → `createAdminClient()`; auth/roles → `lib/auth.ts`.
- Eliminadas llamadas HTTP del servidor a sí mismo (`fetch(SITE/api/...)`): latencia extra, fallaban en previews y obligaban a dejar rutas abiertas.
- Rutas de Anthropic migradas de `fetch` al SDK oficial (ya instalado) con manejo de errores tipado. **Modelos sin cambio.**
- Logo: 145 KB de base64 embebidos en el JS → archivos estáticos. JS inicial de páginas públicas: **~263 KB → ~176 KB**.
- `estadisticas`: conteo O(propiedades × vistas) → O(n).
- Tablero público: N+1 consultas de portadas → 1.
- Layout admin: 2 consultas secuenciales → paralelas.

**Segunda ronda (también hecho):**
- **Sync de Tokko por lotes** (`lib/tokko-sync.ts`): de ~600 consultas secuenciales a ~12 para 191 propiedades; respeta las descripciones editadas a mano (`defaultToNull: false`).
- **Conteos en la base:** KPIs usa `count` en vez de descargar todas las vistas; Propiedades y Estadísticas usan funciones SQL (`supabase/migrations/20261110000000_conteos_por_propiedad.sql`) con respaldo automático si la migración aún no se aplica. La gráfica de 30 días solo descarga esos 30 días.
- **Rate limit global opcional** con Upstash Redis (REST, sin dependencias nuevas). Sin las variables, funciona como antes; si Redis falla, cae al límite local.
- **TypeScript `strict: true`** (14 errores corregidos, incluido un posible crash al exportar el reporte Pro sin datos de canales).
- **Lint en cero:** `<img>` se mantiene a propósito (las ~2,000 fotos de Tokko por `next/image` rebasarían la cuota gratuita de optimización de Vercel); los efectos "solo al montar" quedaron documentados.
- **Content-Security-Policy en modo Report-Only** (no bloquea; avisa en consola).
- Íconos PWA recomprimidos sin pérdida (verificado píxel por píxel): `icon-512.png` 1 MB → 22 KB. Quitado `screenshot.png` inexistente del manifest.
- `.env.example` con todas las variables documentadas.

**Tercera ronda (también hecho):**
- **Formulario de contacto y chatbot ya no escriben a la BD desde el navegador.** Nuevas rutas `/api/contacto`, `/api/sofia/sesion`, `/api/sofia/lead` con validación y límite por IP. El chatbot hacía `insert().select()` en `leads` con la llave pública: eso solo funciona si la tabla de clientes es *legible* públicamente; y cualquiera podía modificar cualquier sesión de chat. El formulario de contacto ahora muestra el error si falla (antes decía "enviado" siempre).
- **CI en GitHub Actions** (`.github/workflows/ci.yml`): typecheck, lint, pruebas y build en cada push a `main` y en cada PR. Verificado en una copia limpia con `npm ci`.

**Después de desplegar esta rama**, ninguna parte del sitio público necesita escribir ni leer con la llave anónima en `leads`, `chatbot_sessions`, `chatbot_messages`, `boards` ni `board_properties`. Puedes quitar esas políticas para `anon` en Supabase (ver §6). Hazlo **después** del deploy, no antes.

**Merge con `main` (feeds por portal, switches, nueva Sofía):**
- Las 13 rutas `/api/feed/<portal>` eran copias idénticas del feed viejo (sin escapar el XML, con `select("*")`). Ahora usan un solo handler (`lib/portal-feed.ts`); mismas URLs y misma columna `publicar_<portal>`.
- La nueva Sofía de `main` (búsqueda en 2 fases) se conservó con las protecciones. Además: la zona/tipo que extrae la IA se metía sin limpiar en filtros `.or()` de PostgREST (una coma o paréntesis del cliente alteraba la consulta), y "muéstrame todo" mandaba el inventario completo al modelo en cada mensaje (ahora el total real con `count` + 40 propiedades).
- `main` pasó las páginas admin a service role (sin RLS). Se conservó, y se agregó que en el detalle de cliente/propiedad el asesor solo abra lo suyo. Se corrigió que las notas de propiedad se guardaban sin autor.

**Pendiente:**
1. **Aplicar la migración SQL** (`supabase/migrations/…conteos_por_propiedad.sql`) en el SQL Editor de Supabase.
2. **Upstash:** crear la base gratuita y agregar `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` en Vercel.
3. **CSP:** revisar la consola del navegador unos días; si no hay avisos, cambiar la clave a `Content-Security-Policy` en `next.config.js`.
4. **Next.js 15/16:** quedan avisos de seguridad que solo se corrigen en versiones mayores. Es una migración grande (React 19, `cookies()`/`params` asíncronos) que conviene hacer con un entorno de staging para probar.
5. **`xlsx` 0.18.5:** vulnerabilidades sin parche en npm. `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (no tuve permiso de instalar fuera de npm). Solo lo usa el importador de admin.
6. **Paginación** de clientes y propiedades: con el volumen actual (cientos) no es necesaria y cambiaría la búsqueda/filtros instantáneos; revisar al pasar de ~2,000 registros.
7. `app/admin/finanzas/page.tsx` (1,413 líneas): dividir en componentes cuando se vuelva a tocar.

---

## 5. Pruebas

No había ninguna prueba. Se agregó Vitest + ESLint:

```
npm test          # 59 pruebas
npm run typecheck
npm run lint
npm run check     # las tres
```

- `tests/security.test.ts`, `validation.test.ts` — escape, validaciones, chat, rate limit.
- `tests/time.test.ts` — zona horaria de Mérida y ventana del cron (incluye el caso de retraso de GitHub).
- `tests/content.test.ts` — feed XML, escape de emails, mapeo de Tokko, lista blanca de tareas.
- `tests/public-forms.test.ts` — contacto y lead del chatbot: validación, sin escrituras ante datos inválidos, límite por IP.
- `tests/tokko-sync.test.ts`, `tests/stats.test.ts` — sync por lotes y conteos con/sin la función SQL.
- `tests/routes-auth.test.ts` — rutas reales con Supabase simulado: sin sesión → 401, asesor ajeno → 404 y **sin escrituras**, usuario desactivado → 401, confirmación de la opción correcta, cron sin secreto.

Se verificó que las pruebas detectan regresiones: contra el código original fallan 5.

**Faltan (requieren entorno):** pruebas E2E con Playwright contra un Supabase de staging (login, crear lead, agendar visita, flujo de email).

---

## 6. SQL para revisar RLS en Supabase (SQL Editor)

```sql
-- ¿Qué tablas NO tienen RLS activado?
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- Políticas que dejan leer/escribir al rol anónimo (público)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and ('anon' = any(roles) or 'public' = any(roles))
order by tablename;
```

Ninguna de estas tablas debería ser accesible con `anon`: `leads`, `google_calendar_tokens`, `push_subscriptions`, `ai_conversations`, `ai_memory`, `appointment_requests`, `deals`, `expenses`, `cuentas_por_pagar`, `financial_history`, `tasks`, `boards`, `board_properties`, `profiles` (salvo lo mínimo).

Después de este cambio, el tablero público ya no necesita que `leads`/`boards` sean legibles con `anon`. Si el chatbot inserta leads desde el navegador (`PublicChatbot.saveLead`), esa política debe ser **solo INSERT**, nunca SELECT.

Para que la llave anónima (que es pública) no pueda leer los datos del propietario aunque alguien consulte la API directamente:

```sql
revoke select on public.properties from anon;
grant select (id, title, description, type, operation, status, price, price_type, currency,
  address, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking,
  amenities, development, reference, agent_id, is_published, lat, lng, featured,
  created_at, updated_at) on public.properties to anon;
```

(El código público ya solo pide esas columnas, así que este cambio no rompe nada.)
