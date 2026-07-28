-- 1) Delete ghost parts that were auto-created from scraped catalogs.
DELETE FROM public.parts p
WHERE coalesce(p.stock,0) = 0
  AND NOT EXISTS (SELECT 1 FROM public.stock_levels sl WHERE sl.part_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.cart_items ci WHERE ci.part_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.wishlist_items wi WHERE wi.part_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.part_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.quotation_items qi WHERE qi.part_id = p.id);

-- 2) Tighten matcher: a part is "in inventory" only if it has a stock_levels row
--    OR has stock > 0. Ghost rows (no stock_levels, no stock) are excluded, so the
--    frontend renders them as "Not Available" instead of "Out of Stock".
CREATE OR REPLACE FUNCTION public.lookup_parts_normalized(_pns text[])
 RETURNS TABLE(id uuid, part_number text, oem_number text, stock integer, match_key text)
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