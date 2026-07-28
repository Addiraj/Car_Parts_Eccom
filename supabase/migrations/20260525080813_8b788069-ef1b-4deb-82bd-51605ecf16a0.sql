
-- Move extensions to dedicated schema
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
alter extension unaccent set schema extensions;

-- Recreate parts_search_trigger with explicit schema + search_path
create or replace function public.parts_search_trigger()
returns trigger language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  new.search_vec :=
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.part_number,''))), 'A') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.oem_number,''))), 'A') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.name,''))), 'B') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.description,''))), 'C') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.manufacturer,''))), 'C');
  new.updated_at = now();
  return new;
end;
$$;

-- set_updated_at also needs search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- Lock down SECURITY DEFINER functions: only callable by triggers / server-side
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- has_role is used inside RLS policies via security definer; policies still work because they run as the definer.
