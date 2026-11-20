-- DESHACER 20261119000000_embeddings_propiedades.sql (Sofía vuelve a solo
-- filtros exactos, sin reordenar por similitud de texto).
drop function if exists public.match_properties(vector(1024), uuid[], int);
alter table public.properties drop column if exists description_embedding;
-- No se quita "extension vector": puede estar en uso por otra cosa; quitarla
-- solo si estás seguro de que nada más la usa.
