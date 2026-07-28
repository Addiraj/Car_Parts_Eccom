DROP FUNCTION IF EXISTS public.lookup_parts_normalized(text[]);

CREATE FUNCTION public.lookup_parts_normalized(_pns text[])
RETURNS TABLE(
  id uuid,
  part_number text,
  oem_number text,
  stock integer,
  price numeric,
  ind_price numeric,
  gar_price numeric,
  export_price numeric,
  match_key text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH input AS (
    SELECT DISTINCT upper(regexp_replace(coalesce(x, ''), '[^A-Za-z0-9]', '', 'g')) AS nk
    FROM unnest(_pns) AS x
    WHERE x IS NOT NULL AND length(trim(x)) > 0
  )
  SELECT p.id,
         p.part_number,
         p.oem_number,
         coalesce(p.stock, 0)::int AS stock,
         p.price,
         p.ind_price,
         p.gar_price,
         p.export_price,
         i.nk AS match_key
  FROM public.parts p
  JOIN input i
    ON i.nk = upper(regexp_replace(coalesce(p.part_number,''), '[^A-Za-z0-9]', '', 'g'))
    OR i.nk = upper(regexp_replace(coalesce(p.oem_number,''), '[^A-Za-z0-9]', '', 'g'))
  WHERE i.nk <> ''
    AND (
      coalesce(p.stock, 0) > 0
      OR EXISTS (SELECT 1 FROM public.stock_levels sl WHERE sl.part_id = p.id)
    );
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_parts_normalized(text[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_search_part_ids_normalized(_q text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH nq AS (
    SELECT upper(regexp_replace(coalesce(_q,''), '[^A-Za-z0-9]', '', 'g')) AS nk
  )
  SELECT p.id
  FROM public.parts p, nq
  WHERE nq.nk <> ''
    AND (
      upper(regexp_replace(coalesce(p.part_number,''), '[^A-Za-z0-9]', '', 'g')) LIKE '%' || nq.nk || '%'
      OR upper(regexp_replace(coalesce(p.oem_number,''),  '[^A-Za-z0-9]', '', 'g')) LIKE '%' || nq.nk || '%'
    )
  LIMIT 2000;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_search_part_ids_normalized(text) TO authenticated, service_role;