CREATE OR REPLACE FUNCTION public.lookup_parts_normalized(_pns text[])
RETURNS TABLE(id uuid, part_number text, oem_number text, stock integer, match_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH input AS (
    SELECT DISTINCT upper(regexp_replace(coalesce(x, ''), '[^A-Za-z0-9]', '', 'g')) AS nk
    FROM unnest(_pns) AS x
    WHERE x IS NOT NULL AND length(trim(x)) > 0
  )
  SELECT p.id,
         p.part_number,
         p.oem_number,
         coalesce(p.stock, 0)::int AS stock,
         i.nk AS match_key
  FROM public.parts p
  JOIN input i
    ON i.nk = upper(regexp_replace(coalesce(p.part_number,''), '[^A-Za-z0-9]', '', 'g'))
    OR i.nk = upper(regexp_replace(coalesce(p.oem_number,''), '[^A-Za-z0-9]', '', 'g'))
  WHERE i.nk <> '';
$$;

GRANT EXECUTE ON FUNCTION public.lookup_parts_normalized(text[]) TO anon, authenticated, service_role;