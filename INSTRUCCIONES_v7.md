# 📋 Instrucciones — Versión 7

Esta versión resuelve 3 problemas:
1. Eliminé TODAS las menciones inventadas (los "20+ años", "400+ clientes", etc.)
2. El logo lo subes desde el admin del sitio (sin GitHub)
3. Importas TODAS tus propiedades de una vez con un Excel/CSV

## 🚀 Pasos para activar v7 (en orden)

### Paso 1 — Correr SQL nuevo en Supabase

Hay un archivo nuevo: **`03_logo_y_branding.sql`** (en la carpeta outputs).

1. Abre Supabase → SQL Editor → New query
2. Pega el contenido del archivo
3. Run
4. Vas a ver "Success" — esto crea la tabla `business_settings` y el bucket `branding` para almacenar tu logo

### Paso 2 — Subir el código v7 a GitHub

Esta es la versión más limpia. Borra el repo y vuelve a subir todo (es lo más rápido cuando hay tantos cambios):

1. GitHub → tu repo → **Settings** → abajo → **"Delete this repository"** → confirma
2. Vuelve al inicio de GitHub → **+ → New repository** → nombre `bs-merida-crm` → **Private** → Create
3. En la pantalla "Quick setup", clic en **"uploading an existing file"**
4. **Abre Finder, entra a la carpeta `bs-merida-crm-v7`**, selecciona TODO con Cmd+A, arrastra a la zona de drag & drop de GitHub
5. Espera a que se carguen todos los archivos (toma 30-60 segundos)
6. Abajo escribe en commit message: `Versión 7 — limpieza + logo desde admin + importador`
7. **Commit changes**

### Paso 3 — Reconectar con Vercel

Como borraste el repo, tienes que importarlo de nuevo:

1. Vercel → tu proyecto **bs-merida-crm** → **Settings** → **Git** → **Disconnect** (si es necesario)
2. Vercel → home → **"Add New" → "Project"** → Importa `bs-merida-crm` otra vez
3. Verifica que en **Environment Variables** estén las 7 (deberían estar, no se borran al borrar el repo). Si no, agrégalas.
4. **Deploy**
5. Espera 1-3 minutos. Cuando diga "Ready", refresca tu URL

### Paso 4 — Subir tu logo (3 minutos, sin GitHub)

1. Entra al admin: `tudominio.vercel.app/admin`
2. En el sidebar izquierdo verás un nuevo item: **"Marca"**
3. Clic → te lleva a `/admin/branding`
4. Clic en **"Subir logo"** → selecciona tu archivo PNG/JPG/SVG (máximo 5MB)
5. **Listo** — tu logo aparece al instante en todas las páginas, sin redeploy ni nada

¡Y además puedes cambiarlo cuando quieras desde la misma pantalla!

### Paso 5 — Importar tus propiedades existentes

1. En el admin, ve a **"Propiedades"** → arriba a la derecha verás un botón nuevo: **"Importar CSV"**
2. Clic → te lleva a `/admin/propiedades/importar`
3. Clic en **"Descargar plantilla CSV"**
4. Abre el archivo descargado en **Excel, Numbers o Google Sheets**
5. Llena una fila por cada propiedad (la plantilla viene con 2 ejemplos para que veas el formato)
6. Guarda como CSV
7. Vuelve a la pantalla de importar, arrastra tu CSV o clic para seleccionarlo
8. Vas a ver una **vista previa** con todas las filas. Las verdes están listas, las rojas tienen errores
9. Si hay rojas, ajusta el archivo y vuelve a subirlo
10. Cuando solo veas verdes, clic **"Importar X propiedades"**
11. En 5 segundos tu inventario está cargado

---

## 📦 Cómo obtener los datos de tus propiedades actuales

Tu pregunta fue cómo migrar las propiedades de tus sitios activos. Las opciones realistas:

### Opción 1: Pídele al equipo de tu sitio actual que te exporte (lo más fácil)
Tu sitio bsmerida.com debe tener una base de datos detrás. El admin/desarrollador del sitio actual puede exportar las propiedades a Excel/CSV en 30 minutos. Pídeselo así:

> "Necesito exportar todas las propiedades activas a Excel/CSV con estas columnas: título, tipo, operación, precio, dirección, zona, ciudad, recámaras, baños, m² construcción, m² terreno, estacionamientos, descripción, amenidades."

Cuando te lo den, ajustas el formato a la plantilla del CRM y lo importas.

### Opción 2: Captura manual con un asistente
Si la opción 1 no es viable (porque ya no tienes contacto con quien hizo el sitio):
- Contrata a alguien por 1-2 días (estudiantes universitarios, ~150-200 MXN/hora)
- Que abra cada propiedad de tu sitio actual y la copie a la plantilla CSV
- Una persona puede capturar 30-50 propiedades por día

### Opción 3: Repartir entre tus asesores
- Cada asesor captura las propiedades que él captó originalmente
- Es justo y rápido si son ~50-100 propiedades total
- Se puede hacer en una semana entre todos

### Opción 4: Te ayudo automáticamente
Si tu sitio actual tiene un feed XML/RSS público (algo como `bsmerida.com/feed.xml`), me lo pasas y te construyo un script que importa todo automáticamente. Para saber si lo tiene, prueba abrir esas URLs en tu navegador y mira si hay XML.

---

## ✅ Cómo PROBAR los cambios

**Datos limpios:**
- Abre `/` y `/nosotros`. Ya no debe aparecer "20 años", "400 clientes", "600 propiedades", "dos décadas", etc.
- En el hero el badge dice "Asesoría inmobiliaria certificada AMPI"

**Logo desde admin:**
1. Entra a `/admin/branding`
2. Subes tu PNG → vista previa instantánea
3. Refresca la página → el logo aparece en el header del admin Y en el sitio público

**Importador:**
1. Ve a `/admin/propiedades/importar`
2. Descarga la plantilla, ábrela. Verás los headers + 2 filas de ejemplo
3. Sin tocar nada, súbela. Te muestra preview con 2 propiedades válidas
4. Clic "Importar 2 propiedades" → te lleva a tu inventario

---

## 🆘 Si algo falla

| Síntoma | Solución |
|---------|----------|
| Build de Vercel falla | Verifica las 7 env vars. Si el error es `business_settings does not exist`, no corriste el SQL del paso 1 |
| `/admin/branding` da error 500 | El SQL del paso 1 no se ejecutó. Cárrelo |
| Subo logo pero no se ve | Refresca con Cmd+Shift+R (caché) |
| El CSV no parsea bien | Abre el CSV en TextEdit y verifica que las columnas estén separadas por comas |
| Importo CSV pero no aparecen las propiedades | Mira la columna "Estado" del preview. Si decía verde y aún así fallaron, mándame screenshot del error |

Cuéntame cuando hayas hecho los pasos y vamos viendo. Y cualquier dato más sobre la inmobiliaria que quieras que aparezca, me lo dices y lo agrego — pero ya no invento nada.
