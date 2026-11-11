-- Agente de fuentes: revisa las carpetas de los proveedores (master brokers) en
-- Google Drive y Dropbox, detecta cambios y propone borradores de propiedades
-- para que una persona los apruebe o rechace en /admin/fuentes.
--
-- Las carpetas son de terceros: el agente SOLO las lee. Nada se publica solo:
-- aprobar un borrador crea la propiedad sin publicar o actualiza los campos
-- aceptados. Esta migración no modifica la tabla properties.

-- ── Fuentes (una por carpeta registrada en el Excel) ────────────────────────
create table if not exists public.fuentes (
  id              text primary key check (id ~ '^F-[0-9]{4}$'),
  proveedor       text not null,
  alcance         text,
  plataforma      text not null check (plataforma in ('Google Drive', 'Dropbox')),
  url             text not null,
  contacto        text,
  responsable     text,
  notas           text,
  agente_activo   boolean not null default false,  -- además de revisar, ¿propone borradores?
  base_cargada    boolean not null default false,  -- la 1a revisión carga el inventario sin generar cambios
  ultima_revision timestamptz,
  estado          text not null default 'Pendiente' check (estado in ('Pendiente', 'Al día', 'Error')),
  error           text,
  created_at      timestamptz not null default now()
);

-- ── Inventario de archivos visto en cada fuente ─────────────────────────────
create table if not exists public.fuente_archivos (
  fuente_id    text not null references public.fuentes(id) on delete cascade,
  archivo_id   text not null,
  nombre       text not null,
  ruta         text not null,          -- ruta relativa a la carpeta de la fuente
  mime         text,
  modificado   timestamptz,
  tamano       bigint,
  url          text,                   -- enlace para abrirlo (Drive) o carpeta (Dropbox)
  visto_en     timestamptz not null default now(),
  eliminado_en timestamptz,            -- ya no aparece; NO significa vendido
  primary key (fuente_id, archivo_id)
);
create index if not exists fuente_archivos_ruta_idx on public.fuente_archivos (fuente_id, ruta);

-- ── Cambios detectados en los archivos ──────────────────────────────────────
create table if not exists public.fuente_cambios (
  id           uuid primary key default gen_random_uuid(),
  fuente_id    text not null references public.fuentes(id) on delete cascade,
  tipo         text not null check (tipo in ('Nuevo', 'Modificado', 'Eliminado')),
  archivo_id   text not null,
  nombre       text not null,
  ruta         text not null,
  detectado_en timestamptz not null default now(),
  revisado     boolean not null default false,
  revisado_por uuid references public.profiles(id) on delete set null,
  revisado_en  timestamptz
);
create index if not exists fuente_cambios_pendientes_idx on public.fuente_cambios (revisado, fuente_id);

-- ── Desarrollos detectados dentro de cada fuente ────────────────────────────
create table if not exists public.fuente_desarrollos (
  id            uuid primary key default gen_random_uuid(),
  fuente_id     text not null references public.fuentes(id) on delete cascade,
  ruta          text not null,           -- carpeta del desarrollo dentro de la fuente
  nombre        text not null,
  estado        text not null default 'Pendiente' check (estado in ('Pendiente', 'Procesado', 'Omitido', 'Error')),
  firma         text,                    -- huella de sus archivos; si cambia, se vuelve a procesar
  clasificacion jsonb,                   -- qué documentos y fotos eligió el clasificador
  error         text,
  procesado_en  timestamptz,
  created_at    timestamptz not null default now(),
  unique (fuente_id, ruta)
);

-- ── Borradores propuestos por el agente ─────────────────────────────────────
create table if not exists public.propiedad_borradores (
  id             uuid primary key default gen_random_uuid(),
  fuente_id      text not null references public.fuentes(id) on delete cascade,
  desarrollo_id  uuid references public.fuente_desarrollos(id) on delete set null,
  clave_modelo   text not null,          -- identifica el modelo entre corridas
  accion         text not null check (accion in ('Nueva', 'Actualizar')),
  property_id    uuid references public.properties(id) on delete set null,
  datos          jsonb not null,         -- campos propuestos con el formato de properties
  cambios        jsonb,                  -- Actualizar: { campo: { antes, despues } }
  fotos          jsonb not null default '[]'::jsonb,
  extra          jsonb,                  -- desarrolladora, modelo, entrega, precio hasta…
  evidencia      jsonb not null default '[]'::jsonb,  -- de qué archivo/página salió cada dato
  dudas          jsonb not null default '[]'::jsonb,
  coincidencia   jsonb,                  -- por qué se emparejó (o no) con el inventario
  estado         text not null default 'Pendiente' check (estado in ('Pendiente', 'Aprobado', 'Rechazado', 'Reemplazado')),
  motivo_rechazo text check (motivo_rechazo in ('Datos', 'Fotos', 'Texto', 'Coincidencia', 'Otro')),
  feedback       text,
  datos_finales  jsonb,                  -- lo que realmente se guardó (incluye correcciones)
  revisado_por   uuid references public.profiles(id) on delete set null,
  revisado_en    timestamptz,
  costo_usd      numeric(10,4),
  created_at     timestamptz not null default now()
);
create index if not exists propiedad_borradores_estado_idx on public.propiedad_borradores (estado, created_at);
-- Solo un borrador pendiente por modelo: uno nuevo reemplaza al anterior.
create unique index if not exists propiedad_borradores_pendiente_uidx
  on public.propiedad_borradores (fuente_id, clave_modelo) where estado = 'Pendiente';

-- ── Vínculo propiedad ↔ modelo de una fuente (sin tocar properties) ─────────
create table if not exists public.propiedad_fuentes (
  property_id   uuid not null references public.properties(id) on delete cascade,
  fuente_id     text not null references public.fuentes(id) on delete cascade,
  clave_modelo  text not null,
  vinculado_en  timestamptz not null default now(),
  primary key (fuente_id, clave_modelo)
);
create index if not exists propiedad_fuentes_property_idx on public.propiedad_fuentes (property_id);

-- ── Lecciones: el feedback de los rechazos, por paso del agente ─────────────
create table if not exists public.agente_lecciones (
  id          uuid primary key default gen_random_uuid(),
  paso        text not null check (paso in ('extractor', 'comparador', 'fotos', 'redactor', 'general')),
  leccion     text not null,
  borrador_id uuid references public.propiedad_borradores(id) on delete set null,
  activa      boolean not null default true,
  creado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Bitácora de corridas (tiempos, costo, errores) ──────────────────────────
create table if not exists public.agente_corridas (
  id          uuid primary key default gen_random_uuid(),
  inicio      timestamptz not null default now(),
  fin         timestamptz,
  resumen     jsonb,
  costo_usd   numeric(10,4) not null default 0,
  errores     jsonb not null default '[]'::jsonb
);

-- ── RLS: solo administradores con sesión. El script usa la service role. ────
create or replace function public.es_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and coalesce(active, true));
$$;

do $$
declare t text;
begin
  foreach t in array array['fuentes','fuente_archivos','fuente_cambios','fuente_desarrollos',
                           'propiedad_borradores','propiedad_fuentes','agente_lecciones','agente_corridas']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.es_admin())', t || '_admin_select', t);
  end loop;
  foreach t in array array['fuentes','fuente_cambios','propiedad_borradores','agente_lecciones']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.es_admin()) with check (public.es_admin())', t || '_admin_update', t);
  end loop;
end $$;
