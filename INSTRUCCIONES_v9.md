# 📋 Instrucciones — Versión 9 (Tokko API + Imágenes)

Esta versión trae el **integrador automático con Tokko**: un solo botón "Sincronizar" trae las 191 propiedades CON imágenes en 1-3 minutos.

## 🚀 Pasos para activar v9

### Paso 1 — Configurar las variables de Tokko en Vercel

Ve a Vercel → tu proyecto → **Settings** → **Environment Variables** y agrega 2 nuevas variables:

| Name | Value |
|------|-------|
| `TOKKO_API_KEY` | el API key que tienes de Tokko |
| `TOKKO_AGENCY_ID` | el ID de tu empresa de Tokko |

⚠️ **MUY IMPORTANTE**: estas dos NO llevan el prefijo `NEXT_PUBLIC_`. Son **secretas** — solo las lee el servidor para hablar con Tokko, nunca se exponen al navegador del cliente. Si por accidente les pones `NEXT_PUBLIC_` cualquiera podría ver tu API key inspeccionando el código del sitio.

Al guardar, marca los 3 checkboxes (Production / Preview / Development).

### Paso 2 — Subir v9 a GitHub

Mismo flujo de siempre (borrar repo + recrear o reemplazar archivos uno por uno). Vercel redeploya solo en 1-2 min.

### Paso 3 — Sincronizar tus 191 propiedades + imágenes

1. En el admin: **Propiedades** → arriba a la derecha verás un nuevo botón morado **"🔄 Sincronizar Tokko"**
2. Clic → te lleva a `/admin/propiedades/tokko`
3. Si ves el panel amarillo "API Key no configurada", regresa al Paso 1
4. Si todo está bien, clic en **"Sincronizar ahora"**
5. Confirma en el popup
6. **Espera 1-3 minutos** (con 191 propiedades + sus imágenes el proceso tarda)
7. Cuando termine vas a ver:
   - Total recibidas: 191 (o lo que tengas en Tokko)
   - Guardadas: 191
   - Fallaron: 0 (idealmente)
   - Imágenes: el total de fotos importadas (probablemente 1500-2500)

8. Ve a `/admin/propiedades` y verás todo tu inventario con sus fichas completas y galerías.

### Paso 4 — Sincronizaciones futuras

Puedes correr "Sincronizar Tokko" cuando quieras. Es **idempotente**:
- Las propiedades nuevas se crean
- Las que ya existían (mismo Tokko ID) se actualizan
- Las imágenes se reemplazan completas (refleja el orden actual de Tokko)
- No duplica nada

Te sugiero hacerlo manualmente cuando edites algo importante en Tokko, o programarlo para que corra solo cada noche (eso lo agregamos después con un cron de Vercel).

---

## 🔍 Cómo funciona detrás de bambalinas

1. **Tu sitio** llama al endpoint `/api/tokko/sync` (autenticado, solo accesible desde el admin)
2. **El endpoint** lee `TOKKO_API_KEY` del servidor (jamás del navegador)
3. **Llama a Tokko**: `https://www.tokkobroker.com/api/v1/property/?key=TU_KEY`
4. **Pagina** las respuestas (50 propiedades por página) hasta traer todas
5. **Por cada propiedad**: la mapea al schema del CRM y hace un `upsert` en Supabase
6. **Por cada propiedad** también borra sus imágenes anteriores y mete las nuevas con orden correcto
7. **Las imágenes** apuntan a las URLs originales de Tokko (no las descargamos al CRM, viven en su CDN)

### ¿Por qué no descargamos las imágenes?

Descargar 2000+ imágenes a Supabase Storage tomaría 30+ minutos y el endpoint timeoutearía. Las URLs de Tokko son públicas y permanentes mientras tengas cuenta activa. Cuando quieras independizarte completamente de Tokko (cancelar la cuenta), te construyo un proceso adicional que descarga todas las imágenes a tu propio almacenamiento.

---

## ⚠️ Si algo falla

| Síntoma | Solución |
|---------|----------|
| "Falta configurar TOKKO_API_KEY" | No agregaste la env var. Agrégala y redeploya |
| "Tokko API 401" | El API key es inválido o expiró. Pídele uno nuevo a Tokko |
| "Tokko API 403" | El API key existe pero no tiene permisos. Habla con Tokko |
| "Tokko API 429" | Demasiadas llamadas, espera 5 min y reintenta |
| El proceso se queda colgado | Vercel timeoutea a 5 min. Si tienes >500 propiedades, hay que paginar el frontend (avísame) |
| Todo se sincronizó pero no veo imágenes | Refresca la página de propiedades. Verifica que `property_images` tenga registros |

---

## 🎯 Después de sincronizar

Vas a tener tu inventario completo. Próximos pasos sugeridos:

1. **Probar las fichas PDF** en algunas propiedades (botón "📄 Descargar ficha PDF")
2. **Probar el feed XML** en `/admin/portales` — copia la URL y ábrela en una pestaña; debes ver tus 191 propiedades en XML
3. **Conectar Inmuebles24 y Vivanuncios** con esa URL de feed (te van a publicar tu inventario)
4. **Conectar el dominio** bsmerida.com cuando estés listo

Avísame cuando hayas sincronizado para ver todo en vivo.
