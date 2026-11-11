-- Conteos de vistas y solicitudes por propiedad, calculados en la base.
-- Reemplaza el patrón de descargar TODAS las filas de property_views /
-- property_inquiries para contarlas en JavaScript (crece sin límite con el tráfico).
--
-- SECURITY INVOKER (por defecto): respetan las políticas RLS de quien las llama,
-- igual que las consultas que reemplazan.

create or replace function public.property_view_counts()
returns table (property_id uuid, total bigint)
language sql stable
as $$
  select property_id, count(*) from public.property_views group by property_id
$$;

create or replace function public.property_inquiry_counts()
returns table (property_id uuid, total bigint)
language sql stable
as $$
  select property_id, count(*) from public.property_inquiries group by property_id
$$;

revoke execute on function public.property_view_counts() from anon;
revoke execute on function public.property_inquiry_counts() from anon;

-- Índices para los conteos y la gráfica de 30 días
create index if not exists property_views_property_id_idx on public.property_views (property_id);
create index if not exists property_views_viewed_at_idx on public.property_views (viewed_at);
create index if not exists property_inquiries_property_id_idx on public.property_inquiries (property_id);
