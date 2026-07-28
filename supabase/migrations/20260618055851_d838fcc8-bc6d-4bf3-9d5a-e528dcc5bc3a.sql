CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS parts_part_number_trgm ON public.parts USING gin (part_number extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS parts_oem_number_trgm ON public.parts USING gin (oem_number extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS parts_name_trgm ON public.parts USING gin (name extensions.gin_trgm_ops);