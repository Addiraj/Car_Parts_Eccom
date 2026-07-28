
CREATE OR REPLACE FUNCTION public.inventory_stats()
RETURNS TABLE(total_skus bigint, low bigint, out_ bigint, total_value numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint AS total_skus,
    count(*) FILTER (WHERE coalesce(stock,0) > 0 AND coalesce(stock,0) <= coalesce(low_stock_threshold,5))::bigint AS low,
    count(*) FILTER (WHERE coalesce(stock,0) <= 0)::bigint AS out_,
    coalesce(sum(coalesce(stock,0) * coalesce(price,0)), 0)::numeric AS total_value
  FROM public.parts;
$$;

REVOKE ALL ON FUNCTION public.inventory_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.inventory_stats() TO authenticated, service_role;
