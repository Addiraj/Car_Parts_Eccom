-- Update parts_search_trigger to include category_tag (the primary group ID for superseded parts)
CREATE OR REPLACE FUNCTION public.parts_search_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO public
AS $function$
begin
  new.search_vec :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.part_number,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.oem_number,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.category_tag,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.name,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description,''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.manufacturer,''))), 'C');
  new.updated_at = now();
  return new;
end;
$function$;
