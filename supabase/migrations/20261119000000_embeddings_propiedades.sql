-- Búsqueda semántica para Sofía: cuando el cliente describe lo que busca con
-- palabras vagas (ambiente, vista, para qué quiere los espacios) en vez de
-- criterios exactos (zona/precio/recámaras), se reordena por similitud de
-- significado en vez de solo por coincidencia de texto.
-- Los embeddings se generan aparte (scripts/generar-embeddings.mjs) con
-- Voyage AI — esta migración solo prepara la columna y la función de búsqueda.
-- Idempotente. Deshacer: supabase/rollback/20261119000000_embeddings_propiedades.sql

create extension if not exists vector;

alter table public.properties
  add column if not exists description_embedding vector(1024);

-- Compara el embedding de lo que el cliente describe contra el de cada
-- propiedad, mostrando las palabras clave de zona/precio/tipo. Se busca solo
-- dentro de candidate_ids (ya filtrados en el código por zona/precio/tipo/
-- recámaras) para no mezclar resultados fuera de esos criterios exactos.
create or replace function public.match_properties(
  query_embedding vector(1024),
  candidate_ids uuid[],
  match_count int default 10
)
returns table(id uuid, similarity float)
language sql stable
as $$
  select id, 1 - (description_embedding <=> query_embedding) as similarity
  from public.properties
  where id = any(candidate_ids) and description_embedding is not null
  order by description_embedding <=> query_embedding
  limit match_count;
$$;
