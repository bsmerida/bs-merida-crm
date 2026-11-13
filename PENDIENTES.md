# Pendientes — CRM Duclaud

Actualizado: 13 nov 2026. Detalle y evidencia de cada punto: reporte de la auditoría del 13 nov (PR `docs/auditoria-noviembre`).

## Le toca al dueño
- [ ] **Vercel → Pro** (el sitio está caído: 402 DEPLOYMENT_DISABLED) y poner tope de gasto.
- [ ] Crear el proyecto Supabase `duclaud-pruebas` y pasar solo su URL.
- [ ] Correr en Supabase (SQL Editor) la consulta de solo lectura de RLS y pegar el resultado.
- [ ] Decir en qué plan está el Supabase de producción (Free/Pro).
- [ ] Decidir los valores correctos de las 10 operaciones "compartida" cuya comisión neta no cuadra.
- [ ] Revisar con abogado el aviso de privacidad (proveedores que reciben datos, fecha y versión).
- [ ] Borrar/rotar la GEMINI_API_KEY del commit local `3c599ad` del clon externo y borrar ese clon.
- [ ] ¿Las comisiones se capturan con o sin IVA?

## Correcciones planeadas (un PR por tema)
- [ ] Finanzas: funciones puras + pruebas; fechas sin corrimiento de zona horaria.
- [ ] Citas: confirmación idempotente; el link del cliente confirma con botón, no al abrirse.
- [ ] Mapas: fotos por lotes (hoy no sale ninguna).
- [ ] Costos: límite de uso en "Generar descripción"; revisar Upstash para Sofía.
- [ ] Monitoreo: errores guardados en BD, `/api/estado`, registro de corridas del cron, pantalla de error.
- [ ] Legal: casilla de consentimiento con fecha y versión guardadas.
- [ ] Respaldos: dump diario cifrado + prueba de restauración en `duclaud-pruebas`; versionar el esquema base.
- [ ] Dependencias: `xlsx` 0.20.3, Dependabot; plan de Next.js 14 → 15 (14 ya no tiene soporte).
- [ ] Pruebas e2e (Playwright + axe) de páginas públicas en CI; flujos privados cuando exista pruebas.
- [ ] Sync de Tokko: no borrar fotos manuales/aprobadas; paginar lectura de propiedades.
- [ ] Subida de fotos: límite de tamaño y redimensionado.
